import nodemailer from "nodemailer";
import { Case, Notification, Task, User } from "../models/index.js";
import { daysUntil } from "../utils/dates.js";

export async function notify(recipient, data) {
  const result = await Notification.findOneAndUpdate(
    { dedupeKey: data.dedupeKey },
    { $setOnInsert: { recipient, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true, includeResultMetadata: true }
  );
  const notification = result.value;
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_PORT, SMTP_FROM } = process.env;
  if (!result.lastErrorObject.updatedExisting && SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    const user = await User.findById(recipient).select("email");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
    });
    await transporter.sendMail({ from: SMTP_FROM, to: user.email, subject: data.title, text: data.message });
  }
  return notification;
}

export async function sendReminders() {
  const now = new Date();
  const tasks = await Task.find({ status: { $nin: ["Completed"] }, dueDate: { $lte: new Date(now.getTime() + 7 * 86400000) } })
    .populate("assignedTo", "_id")
    .populate("case", "title");
  for (const task of tasks) {
    const days = daysUntil(task.dueDate, now);
    const bucket = days < 0 ? "overdue" : days;
    if (![7, 3, 1, 0, "overdue"].includes(bucket)) continue;
    const key = `task:${task.id}:reminder:${bucket}`;
    if (task.reminderKeys.includes(key)) continue;
    const urgent = bucket === 0 || bucket === "overdue";
    await notify(task.assignedTo._id, {
      title: bucket === "overdue" ? "Task overdue" : "Deadline approaching",
      message: `${task.title} — ${task.case?.title ?? "case"} (${bucket === "overdue" ? "overdue" : `${bucket} day(s) remaining`})`,
      category: "deadline",
      priority: urgent ? "urgent" : "high",
      link: "/tasks",
      dedupeKey: key
    });
    task.reminderKeys.push(key);
    await task.save();
  }
  const matters = await Case.find({
    $or: [
      { nextHearingDate: { $lte: new Date(now.getTime() + 7 * 86400000) } },
      { deadline: { $lte: new Date(now.getTime() + 7 * 86400000) } }
    ]
  }).select("title lawyer staff nextHearingDate deadline");
  for (const matter of matters) {
    for (const [kind, date] of [["hearing", matter.nextHearingDate], ["case deadline", matter.deadline]]) {
      if (!date) continue;
      const days = daysUntil(date, now);
      const bucket = days < 0 ? "overdue" : days;
      if (![7, 3, 1, 0, "overdue"].includes(bucket)) continue;
      const recipients = [...new Set([matter.lawyer?.toString(), ...matter.staff.map((id) => id.toString())].filter(Boolean))];
      await Promise.all(recipients.map((recipient) => notify(recipient, {
        title: bucket === "overdue" ? `${kind} overdue` : `${kind} approaching`,
        message: `${matter.title} (${bucket === "overdue" ? "overdue" : `${bucket} day(s) remaining`})`,
        category: kind === "hearing" ? "hearing" : "deadline",
        priority: bucket === 0 || bucket === "overdue" ? "urgent" : "high",
        link: `/cases/${matter.id}`,
        dedupeKey: `case:${matter.id}:${kind}:${bucket}:${new Date(date).toISOString().slice(0, 10)}`
      })));
    }
  }
}
