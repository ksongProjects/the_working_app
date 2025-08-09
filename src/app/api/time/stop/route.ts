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

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, sourceType, sourceId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (!openEntry) return NextResponse.json({ error: 'no-open-entry' }, { status: 400 });

  const updated = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { endedAt: new Date() },
  });
  // Optional: push worklog if configured
  try {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    if (settings?.autoPushWorklog && sourceType === 'jira' && sourceId && updated.endedAt) {
      const comment = settings.defaultWorklogCommentTemplate ?? undefined;
      await addWorklog({ userId, issueKey: sourceId, started: updated.startedAt, ended: updated.endedAt, comment });
      await prisma.timeEntry.update({ where: { id: updated.id }, data: { pushedToJiraWorklogAt: new Date() } });
    }
  } catch {
    // swallow to not block stop action
  }
  return NextResponse.json({ ok: true, id: updated.id });
}


