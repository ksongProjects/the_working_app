import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await prisma.todayIssue.findMany({
    where: { userId: session.user.id },
    orderBy: { orderIndex: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json();
  const action = body?.action as 'add' | 'remove' | 'reorder' | undefined;
  if (!action) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  if (action === 'add') {
    const { issueKey, notes } = body as { issueKey: string; notes?: string };
    const max = await prisma.todayIssue.aggregate({
      where: { userId: session.user.id },
      _max: { orderIndex: true },
    });
    const orderIndex = (max._max.orderIndex ?? 0) + 1;
    const row = await prisma.todayIssue.upsert({
      where: { userId_issueKey: { userId: session.user.id, issueKey } },
      create: { userId: session.user.id, issueKey, orderIndex, notes },
      update: { notes },
    });
    return NextResponse.json(row);
  }

  if (action === 'remove') {
    const { issueKey } = body as { issueKey: string };
    await prisma.todayIssue.delete({
      where: { userId_issueKey: { userId: session.user.id, issueKey } },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reorder') {
    const { order } = body as { order: string[] };
    const updates = order.map((issueKey, idx) =>
      prisma.todayIssue.update({
        where: { userId_issueKey: { userId: session.user.id, issueKey } },
        data: { orderIndex: idx + 1 },
      })
    );
    await prisma.$transaction(updates);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
}


