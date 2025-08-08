Setup

1) Environment
- Create `.env` with:
  - NEXTAUTH_SECRET
  - DATABASE_URL (Supabase pooler 6543)
  - DIRECT_URL (Supabase direct 5432)
  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
  - AZURE_AD_CLIENT_ID / AZURE_AD_CLIENT_SECRET / AZURE_AD_TENANT_ID
  - ATLASSIAN_CLIENT_ID / ATLASSIAN_CLIENT_SECRET

2) Install & generate
```
npm install
npm run prisma:generate
```

3) Migrate database
```
npm run prisma:migrate -- --name init
```

4) Run dev
```
npm run dev
```

5) Sign in & connect
- Visit `/settings/connections` and connect Google/Microsoft/Atlassian.

