import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const settings = await prisma.settings.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(settings ?? {});
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json();
  const { autoPushWorklog, defaultWorklogCommentTemplate, timezone, workdayStart, workdayEnd, googleSyncIntervalMinutes, microsoftSyncIntervalMinutes, atlassianSyncIntervalMinutes } = body as {
    autoPushWorklog?: boolean;
    defaultWorklogCommentTemplate?: string | null;
    timezone?: string | null;
    workdayStart?: string | null;
    workdayEnd?: string | null;
    googleSyncIntervalMinutes?: number | null;
    microsoftSyncIntervalMinutes?: number | null;
    atlassianSyncIntervalMinutes?: number | null;
  };
  const data: any = {};
  if (typeof autoPushWorklog === 'boolean') data.autoPushWorklog = autoPushWorklog;
  if (typeof defaultWorklogCommentTemplate !== 'undefined') data.defaultWorklogCommentTemplate = defaultWorklogCommentTemplate;
  if (typeof timezone !== 'undefined') data.timezone = timezone;
  if (typeof workdayStart !== 'undefined') data.workdayStart = workdayStart ? new Date(workdayStart) : null;
  if (typeof workdayEnd !== 'undefined') data.workdayEnd = workdayEnd ? new Date(workdayEnd) : null;
  if (typeof googleSyncIntervalMinutes !== 'undefined') data.googleSyncIntervalMinutes = googleSyncIntervalMinutes;
  if (typeof microsoftSyncIntervalMinutes !== 'undefined') data.microsoftSyncIntervalMinutes = microsoftSyncIntervalMinutes;
  if (typeof atlassianSyncIntervalMinutes !== 'undefined') data.atlassianSyncIntervalMinutes = atlassianSyncIntervalMinutes;
  const updated = await prisma.settings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });
  return NextResponse.json(updated);
}


