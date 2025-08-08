import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const sourceType = String(form.get('sourceType') || 'custom');
  const sourceId = form.get('sourceId') ? String(form.get('sourceId')) : null;

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      sourceType,
      sourceId: sourceId || undefined,
      startedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true, id: entry.id });
}


