API reference (selected)

Jira

- GET /api/jira/issues/search?jql=...&maxResults=20
- GET /api/jira/today
- POST /api/jira/today { action: 'add'|'remove'|'reorder', issueKey?, order? }
- POST /api/jira/issue/:key/worklog { started, ended, comment? }

Time entries

- POST /api/time/start (formData: sourceType, sourceId?)
- POST /api/time/stop (formData: sourceType, sourceId?)
