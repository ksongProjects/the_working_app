Architecture

- Next.js App Router (server components + API routes)
- UI: Tailwind + Base UI primitives + Sonner toasts
- Auth: NextAuth (database sessions) + Prisma adapter
- DB: Postgres (Supabase/Neon) via Prisma
- Integrations: Atlassian REST v3, Google Calendar, Microsoft Graph

Request flow
- Client invokes server actions/API routes
- Server authenticates via NextAuth session
- Tokens resolved from `ConnectedAccount`, refreshed by provider flows
- Prisma for reads/writes

