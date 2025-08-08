import { getAtlassianClient } from './client';

export async function addWorklog(params: {
  userId: string;
  issueKey: string;
  started: Date;
  ended: Date;
  comment?: string;
}) {
  const { userId, issueKey, started, ended, comment } = params;
  const { accessToken, cloudId } = await getAtlassianClient(userId);
  const durationMs = Math.max(0, ended.getTime() - started.getTime());
  const seconds = Math.floor(durationMs / 1000);

  type WorklogBody = {
    started: string;
    timeSpentSeconds: number;
    comment?: string;
  };

  const body: WorklogBody = {
    started: started.toISOString(),
    timeSpentSeconds: seconds,
    comment: comment || undefined,
  };

  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/worklog`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Add worklog failed: ${res.status} ${text}`);
  }
  return res.json();
}


