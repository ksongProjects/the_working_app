import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type NextAuthOptions, type Account, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Atlassian from 'next-auth/providers/atlassian';
import AzureAD from 'next-auth/providers/azure-ad';
import { prisma } from '@/lib/prisma';
import { upsertLinkedAccount } from '@/server/oauth/saveLinkedAccount';

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        name: { label: 'Name', type: 'text', optional: true },
      },
      async authorize(credentials): Promise<User | null> {
        const email = (credentials?.email || '').toString().trim().toLowerCase();
        if (!email) return null;
        // Find or create a user with this email
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return { id: existing.id, email: existing.email, name: existing.name } as User;
        const created = await prisma.user.create({
          data: { email, name: (credentials?.name as string | undefined) || null },
        });
        return { id: created.id, email: created.email, name: created.name } as User;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
      authorization: {
        params: {
          scope: 'openid profile email offline_access Calendars.ReadWrite',
        },
      },
    }),
    Atlassian({
      clientId: process.env.ATLASSIAN_CLIENT_ID!,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'offline_access read:jira-user read:jira-work write:jira-work read:me',
        },
      },
    }),
  ],
  events: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      if (!account || !user?.id) return;
      const provider = account.provider as 'atlassian' | 'google' | 'azure-ad';
      const mappedProvider = provider === 'azure-ad' ? 'microsoft' : provider;
      await upsertLinkedAccount({
        userId: user.id,
        provider: mappedProvider,
        accountId: account.providerAccountId ?? account.accountId ?? '',
        accessToken: account.access_token ?? '',
        refreshToken: account.refresh_token ?? null,
        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
        scopes: account.scope ?? null,
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);


