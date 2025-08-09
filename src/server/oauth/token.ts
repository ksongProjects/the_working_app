import { prisma } from '@/lib/prisma';

type Provider = 'google' | 'microsoft' | 'atlassian';

export async function getValidAccessToken(userId: string, provider: Provider): Promise<string | null> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { accessToken: true, refreshToken: true, expiresAt: true, scopes: true },
  });
  if (!account?.accessToken) return null;

  const now = Date.now();
  const expiresAtMs = account.expiresAt ? new Date(account.expiresAt).getTime() : null;
  const isExpired = expiresAtMs !== null && expiresAtMs - now <= 60_000; // refresh if expiring within 60s

  if (!isExpired) return account.accessToken;

  if (!account.refreshToken) return account.accessToken; // no refresh token; try with existing token

  try {
    const refreshed = await refreshProviderToken(provider, account.refreshToken, account.scopes ?? undefined);
    await prisma.connectedAccount.update({
      where: { userId_provider: { userId, provider } },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? undefined,
        expiresAt: refreshed.expiresInSeconds
          ? new Date(Date.now() + refreshed.expiresInSeconds * 1000)
          : undefined,
      },
    });
    return refreshed.accessToken;
  } catch {
    return account.accessToken;
  }
}

type RefreshResult = { accessToken: string; refreshToken?: string | null; expiresInSeconds?: number | null };

async function refreshProviderToken(provider: Provider, refreshToken: string, scopes?: string): Promise<RefreshResult> {
  if (provider === 'google') return refreshGoogle(refreshToken);
  if (provider === 'microsoft') return refreshMicrosoft(refreshToken, scopes);
  if (provider === 'atlassian') return refreshAtlassian(refreshToken);
  throw new Error('Unsupported provider');
}

async function refreshGoogle(refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Google refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSeconds: data.expires_in ?? null };
}

async function refreshMicrosoft(refreshToken: string, scopes?: string | null): Promise<RefreshResult> {
  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
  const tenant = process.env.AZURE_AD_TENANT_ID || 'common';
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: scopes || 'openid profile email offline_access Calendars.ReadWrite',
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSeconds: data.expires_in ?? null };
}

async function refreshAtlassian(refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.ATLASSIAN_CLIENT_ID!;
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET!;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Atlassian refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSeconds: data.expires_in ?? null };
}


