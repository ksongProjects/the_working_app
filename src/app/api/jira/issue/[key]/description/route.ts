import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { updateIssueDescription } from '@/server/atlassian/issue';

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { key } = await context.params;
  const body = await request.json();
  const text = String(body?.text || '');
  try {
    const data = await updateIssueDescription(userId, key, text);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'jira_error', message }, { status: 500 });
  }
}


