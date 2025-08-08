import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { addWorklog } from '@/server/atlassian/worklog';

export async function POST(request: Request, context: { params: { key: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { key } = context.params;
  const body = await request.json();
  const started = new Date(body.started);
  const ended = new Date(body.ended);
  const comment = body.comment as string | undefined;
  try {
    const data = await addWorklog({ userId: session.user.id, issueKey: key, started, ended, comment });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'jira_error', message }, { status: 500 });
  }
}


