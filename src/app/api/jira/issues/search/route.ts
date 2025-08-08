import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { getAtlassianClient } from '@/server/atlassian/client';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const jql = searchParams.get('jql') || 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC';
  const maxResults = Number(searchParams.get('maxResults') || 20);

  const { accessToken, cloudId } = await getAtlassianClient(session.user.id);
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ jql, maxResults, fields: ['summary', 'status', 'assignee', 'project'] }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: 'jira_error', status: res.status, body: text }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}


