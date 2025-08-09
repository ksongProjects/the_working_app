import { NextResponse } from 'next/server';
import { pipeline, env } from '@xenova/transformers';

// Disable remote model downloads at runtime unless allowed; here we allow HTTP fetch.
env.allowLocalModels = false;

let embedderPromise: Promise<any> | null = null;
async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPromise;
}

const MEETING_SEEDS = [
  'team meeting',
  'client call',
  'standup',
  '1:1',
  'zoom call',
  'google meet',
  'calendar event',
];
const WORK_SEEDS = [
  'implement feature',
  'fix bug',
  'code review',
  'jira task',
  'development work',
];

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = (body?.text || '').toString();
  if (!text.trim()) return NextResponse.json({ error: 'missing text' }, { status: 400 });

  // Heuristic boost
  const low = text.toLowerCase();
  const hasMeetingKw = /(meet|call|sync|stand.?up|1:?1|zoom|teams|google meet)/i.test(low);
  const hasWorkKw = /([A-Z]{2,}-\d+)|(implement|fix|review|deploy|task|todo)/i.test(text);

  const extractor = await getEmbedder();
  // @ts-ignore transformers.js returns array
  const emb = (await extractor(text, { pooling: 'mean', normalize: true })) as number[];

  async function score(seeds: string[]) {
    let best = -1;
    for (const s of seeds) {
      // @ts-ignore
      const e = (await extractor(s, { pooling: 'mean', normalize: true })) as number[];
      const c = cosine(emb, e);
      if (c > best) best = c;
    }
    return best;
  }

  const [mScore, wScore] = await Promise.all([score(MEETING_SEEDS), score(WORK_SEEDS)]);
  let label: 'meeting' | 'work_item' = mScore >= wScore ? 'meeting' : 'work_item';
  let confidence = Math.max(mScore, wScore);

  // Heuristic nudge
  if (hasMeetingKw && !hasWorkKw) label = 'meeting';
  if (hasWorkKw && !hasMeetingKw) label = 'work_item';

  return NextResponse.json({ label, confidence, method: 'embeddings' });
}


