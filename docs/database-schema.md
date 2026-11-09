# Database schema

Mongoose models are declared in `backend/src/models/index.js`; references use MongoDB ObjectIds and timestamped records.

| Model | Main fields / relationships |
|---|---|
| User | Name, unique email, bcrypt password, role, active state, password reset hash/expiry |
| Case | Unique case ID, type/status/priority, client and lawyer references, staff references, court and hearing/deadline dates |
| Task | Related case, assignee and creator, due/status/priority, historical delay features and cached risk result |
| Notification | Recipient, category, priority, read time, navigation link and unique deduplication key |
| Communication | Client, case, sender/receiver, message, channel, internal flag and optional follow-up |
| Document | Case and uploader, generated storage name, original name, MIME type and size |
| AuditLog | Actor, action, entity reference and timestamp |

Client accounts are `User` records with role `client`; this avoids keeping a duplicate client identity/profile store. File binaries are private local files while metadata is stored in MongoDB. Deployments should use managed private object storage and retention/backup controls.
