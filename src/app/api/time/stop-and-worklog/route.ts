import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';
import { addWorklog } from '@/server/atlassian/worklog';

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const sourceType = String(form.get('sourceType') || 'custom');
  const sourceId = form.get('sourceId') ? String(form.get('sourceId')) : null;
  const comment = form.get('comment') ? String(form.get('comment')) : undefined;

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, sourceType, sourceId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (!openEntry) return NextResponse.json({ error: 'no-open-entry' }, { status: 400 });

  const updated = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { endedAt: new Date() },
  });

  if (sourceType === 'jira' && sourceId && updated.endedAt) {
    const effectiveComment = comment || (await prisma.settings.findUnique({ where: { userId } }))?.defaultWorklogCommentTemplate || undefined;
    try {
      await addWorklog({ userId, issueKey: sourceId, started: updated.startedAt, ended: updated.endedAt, comment: effectiveComment });
      const pushedAt = new Date();
      await prisma.timeEntry.update({ where: { id: updated.id }, data: { pushedToJiraWorklogAt: pushedAt } });
      return NextResponse.json({ ok: true, id: updated.id, worklog: 'pushed', pushedAt: pushedAt.toISOString() });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ ok: true, id: updated.id, worklog: 'failed', message });
    }
  }

  return NextResponse.json({ ok: true, id: updated.id, worklog: 'skipped' });
}


