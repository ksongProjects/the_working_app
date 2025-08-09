import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { addWorklog } from '@/server/atlassian/worklog';

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { key } = await context.params;
  const body = await request.json();
  const started = new Date(body.started);
  const ended = new Date(body.ended);
  const comment = body.comment as string | undefined;
  try {
    const data = await addWorklog({ userId, issueKey: key, started, ended, comment });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'jira_error', message }, { status: 500 });
  }
}


