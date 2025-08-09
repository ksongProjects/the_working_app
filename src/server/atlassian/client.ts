import { getValidAccessToken } from '@/server/oauth/token';

export type AtlassianClient = {
  accessToken: string;
  cloudId: string;
};

async function getAccessibleResources(accessToken: string) {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Atlassian accessible-resources failed: ${res.status}`);
  return (await res.json()) as Array<{ id: string; name: string; scopes: string[]; url: string; avatarUrl?: string; }>; // includes Jira and Confluence
}

export async function getAtlassianClient(userId: string): Promise<AtlassianClient> {
  const accessToken = await getValidAccessToken(userId, 'atlassian');
  if (!accessToken) throw new Error('No Atlassian account linked');

  const resources = await getAccessibleResources(accessToken);
  const jira = resources.find((r) => r.scopes?.length && r.scopes.some((s) => s.includes('jira')));
  const fallback = resources[0];
  const cloudId = jira?.id ?? fallback?.id;
  if (!cloudId) throw new Error('No accessible Jira cloud found');

  return { accessToken, cloudId };
}

export async function listJiraProjects(userId: string) {
  const { accessToken, cloudId } = await getAtlassianClient(userId);
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`List projects failed: ${res.status}`);
  const data = await res.json();
  const values: Array<{ id: string; key: string; name: string }>= data?.values ?? [];
  return values.map(p => ({ id: p.id, key: p.key, name: p.name }));
}

export async function listJiraDashboards(userId: string) {
  const { accessToken, cloudId } = await getAtlassianClient(userId);
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`List dashboards failed: ${res.status}`);
  const data = await res.json();
  const dashboards: Array<{ id: string; name: string }>= data?.dashboards ?? [];
  return dashboards.map(d => ({ id: String(d.id), name: d.name }));
}


