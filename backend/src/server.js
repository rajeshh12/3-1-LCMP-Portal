import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { sendReminders } from "./services/notifications.js";

const port = Number(process.env.PORT || 4000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}
await connectDatabase();
app.listen(port, () => console.log(`Legal Portal API listening on http://localhost:${port}`));
await sendReminders();
setInterval(() => sendReminders().catch((error) => console.error("Reminder job failed", error)), 60 * 60 * 1000);
