import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { getAtlassianClient } from '@/server/atlassian/client';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = (session as { user?: { id?: string } } | null)?.user?.id;
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const jql = searchParams.get('jql') ||
      'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC';
    const maxResults = Number(searchParams.get('maxResults') || 20);

    const { accessToken, cloudId } = await getAtlassianClient(userId);
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ['summary', 'status', 'assignee', 'project'],
        }),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {}
      // Surface the upstream status code instead of always 500
      return NextResponse.json(
        { error: 'jira_error', status: res.status, body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[jira.search] error', message);
    if (typeof message === 'string' && message.toLowerCase().includes('no atlassian')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


