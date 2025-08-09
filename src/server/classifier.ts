import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

type FeatureExtractor = (text: string, opts: { pooling: 'mean'; normalize: boolean }) => Promise<number[]>;
let embedderPromise: Promise<FeatureExtractor> | null = null;
async function getEmbedder(): Promise<FeatureExtractor> {
  if (!embedderPromise) {
    // @ts-expect-error transformers typing
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as Promise<FeatureExtractor>;
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

export async function classifyText(text: string): Promise<{ label: 'meeting' | 'work_item'; confidence: number; method: 'embeddings' }>{
  const low = text.toLowerCase();
  const hasMeetingKw = /(meet|call|sync|stand.?up|1:?1|zoom|teams|google meet)/i.test(low);
  const hasWorkKw = /([A-Z]{2,}-\d+)|(implement|fix|review|deploy|task|todo)/i.test(text);

  const extractor = await getEmbedder();
  const emb = await extractor(text, { pooling: 'mean', normalize: true });

  async function score(seeds: string[]) {
    let best = -1;
    for (const s of seeds) {
      const e = await extractor(s, { pooling: 'mean', normalize: true });
      const c = cosine(emb, e);
      if (c > best) best = c;
    }
    return best;
  }

  const [mScore, wScore] = await Promise.all([score(MEETING_SEEDS), score(WORK_SEEDS)]);
  let label: 'meeting' | 'work_item' = mScore >= wScore ? 'meeting' : 'work_item';
  const confidence = Math.max(mScore, wScore);
  if (hasMeetingKw && !hasWorkKw) label = 'meeting';
  if (hasWorkKw && !hasMeetingKw) label = 'work_item';
  return { label, confidence, method: 'embeddings' };
}


