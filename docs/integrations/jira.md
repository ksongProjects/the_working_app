Jira integration

Auth
- OAuth 2.0 (3LO) via NextAuth Atlassian provider
- Scopes: offline_access, read:jira-user, read:jira-work, write:jira-work, read:me

Cloud discovery
- GET https://api.atlassian.com/oauth/token/accessible-resources
- Choose a Jira cloudId from the result

Search
- POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/search
- Body: { jql, fields, maxResults }

Today list
- GET/POST /api/jira/today
- add/remove/reorder persisted in `TodayIssue`

Worklogs (planned)
- POST /api/jira/issue/:key/worklog -> Jira v3 worklog create

