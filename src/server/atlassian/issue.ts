import { getAtlassianClient } from './client';

function toAtlassianDoc(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: text
          ? [
              {
                type: 'text',
                text,
              },
            ]
          : [],
      },
    ],
  };
}

export async function addIssueComment(userId: string, issueKey: string, text: string) {
  const { accessToken, cloudId } = await getAtlassianClient(userId);
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ body: toAtlassianDoc(text) }),
  });
  if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
  return res.json();
}

export async function updateIssueDescription(userId: string, issueKey: string, text: string) {
  const { accessToken, cloudId } = await getAtlassianClient(userId);
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields: { description: toAtlassianDoc(text) } }),
  });
  if (!res.ok) throw new Error(`Update description failed: ${res.status}`);
  return { ok: true };
}


