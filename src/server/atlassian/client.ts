import { prisma } from '@/lib/prisma';

export type AtlassianClient = {
  accessToken: string;
  cloudId: string;
};

async function getAccessibleResources(accessToken: string) {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Atlassian accessible-resources failed: ${res.status}`);
  return (await res.json()) as Array<{ id: string; name: string; scopes: string[]; url: string; avatarUrl?: string; }>; // includes Jira and Confluence
}

export async function getAtlassianClient(userId: string): Promise<AtlassianClient> {
  const linked = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'atlassian' } },
    select: { accessToken: true },
  });
  if (!linked?.accessToken) throw new Error('No Atlassian account linked');

  const resources = await getAccessibleResources(linked.accessToken);
  const jira = resources.find((r) => r.scopes?.length && r.scopes.some((s) => s.includes('jira')));
  const fallback = resources[0];
  const cloudId = jira?.id ?? fallback?.id;
  if (!cloudId) throw new Error('No accessible Jira cloud found');

  return { accessToken: linked.accessToken, cloudId };
}


