import { NextResponse } from 'next/server';
import { classifyText } from '@/server/classifier';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = (body?.text || '').toString();
  if (!text.trim()) return NextResponse.json({ error: 'missing text' }, { status: 400 });

  const { label, confidence, method } = await classifyText(text);
  return NextResponse.json({ label, confidence, method });
}


