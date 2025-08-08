import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const sourceType = String(form.get('sourceType') || 'custom');
  const sourceId = form.get('sourceId') ? String(form.get('sourceId')) : null;

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, sourceType, sourceId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (!openEntry) return NextResponse.json({ error: 'no-open-entry' }, { status: 400 });

  const updated = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { endedAt: new Date() },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}


