import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET() {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const settings = await prisma.settings.findUnique({ where: { userId } });
  return NextResponse.json(settings ?? {});
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json();
  const { autoPushWorklog, defaultWorklogCommentTemplate, timezone, workdayStart, workdayEnd, googleSyncIntervalMinutes, microsoftSyncIntervalMinutes, atlassianSyncIntervalMinutes, googleMonthsBefore, googleMonthsAfter, microsoftMonthsBefore, microsoftMonthsAfter, jiraSelectedProjectKeys, jiraSelectedDashboardIds, dashboardLayout, dashboardZones } = body as {
    autoPushWorklog?: boolean;
    defaultWorklogCommentTemplate?: string | null;
    timezone?: string | null;
    workdayStart?: string | null;
    workdayEnd?: string | null;
    googleSyncIntervalMinutes?: number | null;
    microsoftSyncIntervalMinutes?: number | null;
    atlassianSyncIntervalMinutes?: number | null;
    googleMonthsBefore?: number | null;
    googleMonthsAfter?: number | null;
    microsoftMonthsBefore?: number | null;
    microsoftMonthsAfter?: number | null;
    jiraSelectedProjectKeys?: string[] | null;
    jiraSelectedDashboardIds?: string[] | null;
    dashboardLayout?: 'threeColumn' | 'twoByTwo' | 'split' | null;
    dashboardZones?: any;
  };
  const data: Record<string, unknown> = {};
  if (typeof autoPushWorklog === 'boolean') data.autoPushWorklog = autoPushWorklog;
  if (typeof defaultWorklogCommentTemplate !== 'undefined') data.defaultWorklogCommentTemplate = defaultWorklogCommentTemplate;
  if (typeof timezone !== 'undefined') data.timezone = timezone;
  if (typeof workdayStart !== 'undefined') data.workdayStart = workdayStart ? new Date(workdayStart) : null;
  if (typeof workdayEnd !== 'undefined') data.workdayEnd = workdayEnd ? new Date(workdayEnd) : null;
  if (typeof googleSyncIntervalMinutes !== 'undefined') data.googleSyncIntervalMinutes = googleSyncIntervalMinutes;
  if (typeof microsoftSyncIntervalMinutes !== 'undefined') data.microsoftSyncIntervalMinutes = microsoftSyncIntervalMinutes;
  if (typeof atlassianSyncIntervalMinutes !== 'undefined') data.atlassianSyncIntervalMinutes = atlassianSyncIntervalMinutes;
  if (typeof googleMonthsBefore !== 'undefined') data.googleMonthsBefore = googleMonthsBefore;
  if (typeof googleMonthsAfter !== 'undefined') data.googleMonthsAfter = googleMonthsAfter;
  if (typeof microsoftMonthsBefore !== 'undefined') data.microsoftMonthsBefore = microsoftMonthsBefore;
  if (typeof microsoftMonthsAfter !== 'undefined') data.microsoftMonthsAfter = microsoftMonthsAfter;
  if (typeof jiraSelectedProjectKeys !== 'undefined') data.jiraSelectedProjectKeys = jiraSelectedProjectKeys;
  if (typeof jiraSelectedDashboardIds !== 'undefined') data.jiraSelectedDashboardIds = jiraSelectedDashboardIds;
  if (typeof dashboardLayout !== 'undefined') data.dashboardLayout = dashboardLayout as any;
  if (typeof dashboardZones !== 'undefined') data.dashboardZones = dashboardZones as any;
  const updated = await prisma.settings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return NextResponse.json(updated);
}


