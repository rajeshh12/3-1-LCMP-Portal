# System workflow

1. A user signs in; Express validates the password and returns a signed access token. Protected browser routes and every API handler enforce roles independently.
2. Authorized staff create matters and tasks. Mongoose persists records and the API writes an audit event.
3. Task changes trigger a fresh deadline estimate. When FastAPI is healthy, its held-out-trained pipeline returns a probability. Otherwise a deterministic, explainable local rule set is used and identified as a fallback.
4. The API classifies the estimate at configurable 30%/65% cutoffs, persists factors/recommendations, and creates a deduplicated urgent alert for high-risk deadlines.
5. A periodic worker checks 7/3/1/0-day and overdue reminders. MongoDB notification records power the inbox; email sends only with complete SMTP configuration.
6. Case-scoped task, message and document endpoints feed the dashboards and calendar. Analytics query live MongoDB data and are filtered to the signed-in user's accessible matters.

All names, matter narratives, clients, courts and task data in the seed are fictional synthetic examples.
