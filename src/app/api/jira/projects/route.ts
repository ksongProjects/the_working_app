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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


