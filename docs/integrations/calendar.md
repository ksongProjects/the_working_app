Calendar integration

- Google Calendar via REST v3
- Microsoft Outlook via Microsoft Graph

Fetch events for a day

- Google: list primary events with timeMin/timeMax
- Microsoft: /me/calendarView with startDateTime & endDateTime

Mirror schedule blocks (Google)

- Create: POST https://www.googleapis.com/calendar/v3/calendars/primary/events
- Update: PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}
- We store `provider` and `providerEventId` on `ScheduleBlock`

Notes

- Use offline scopes and refresh tokens for long-lived access
- Respect user timezone and all day events later
