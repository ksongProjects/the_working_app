import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { listJiraProjects } from '@/server/atlassian/client';

export async function GET() {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const items = await listJiraProjects(userId);
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    // If the error is due to missing Atlassian account, surface 401 to clients
    if (typeof message === 'string' && message.toLowerCase().includes('no atlassian')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


