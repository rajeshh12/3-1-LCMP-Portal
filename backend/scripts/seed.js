import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/db.js";
import { AuditLog, Case, Communication, Document, Notification, Task, User } from "../src/models/index.js";
import { predictRisk } from "../src/services/risk.js";

const password = await bcrypt.hash("DemoPass!234", 12);
const fictionalNames = ["Ananya Iyer", "Kabir Mehta", "Ishita Rao", "Arjun Nair", "Meera Shah", "Dev Malhotra", "Tara Menon", "Rohan Khanna", "Aditi Kapoor", "Nikhil Bose", "Sana Qureshi", "Vivaan Desai", "Mira Chawla", "Aarav Kulkarni", "Leela Bhat"];
const clientsByIndex = (index) => fictionalNames[index % fictionalNames.length];
const caseTypes = ["Civil", "Criminal", "Family", "Property", "Corporate", "Labour", "Consumer", "Other"];
const caseStatuses = ["New", "Active", "Pending", "Under Review", "Hearing Scheduled", "Completed", "Closed"];
const tasksTitle = ["Prepare case brief", "Review supporting documents", "Draft written submissions", "Coordinate witness availability", "File procedural application", "Compile hearing bundle", "Confirm client instructions", "Review opposing submissions", "Prepare settlement note", "Update matter chronology"];
const courts = ["Bombay High Court", "Delhi District Court", "Madras High Court", "Karnataka High Court", "City Civil Court, Mumbai", "Family Court, Pune"];
const dateOffset = (days) => new Date(Date.now() + days * 86400000);
const pick = (list, index) => list[index % list.length];

await connectDatabase();
await Promise.all([AuditLog.deleteMany({}), Communication.deleteMany({}), Document.deleteMany({}), Notification.deleteMany({}), Task.deleteMany({}), Case.deleteMany({}), User.deleteMany({})]);

const initialUsers = await User.create([
  { name: "Rhea Wexler", email: "admin@briefcase.test", password, role: "admin" },
  { name: "Aarav Khanna", email: "lawyer@briefcase.test", password, role: "lawyer" },
  { name: "Mira Kapoor", email: "staff@briefcase.test", password, role: "staff" },
  { name: "Ananya Iyer", email: "client@briefcase.test", password, role: "client" }
]);
const lawyers = [initialUsers[1], ...await User.create(Array.from({ length: 10 }, (_, index) => ({
  name: `${clientsByIndex(index + 2)} (Counsel)`,
  email: `counsel${String(index + 1).padStart(2, "0")}@briefcase.test`,
  password,
  role: "lawyer"
})))];
const staff = initialUsers[2];
const clients = [initialUsers[3], ...await User.create(Array.from({ length: 29 }, (_, index) => ({
  name: clientsByIndex(index + 1),
  email: `client${String(index + 1).padStart(2, "0")}@briefcase.test`,
  password,
  role: "client"
})))];

const matters = await Case.create(Array.from({ length: 100 }, (_, index) => ({
  caseId: `LC-${String(260001 + index)}`,
  title: pick(["Commercial lease dispute", "Property title review", "Employment separation matter", "Consumer service claim", "Family settlement petition", "Shareholder agreement dispute", "Contract recovery proceeding", "Land acquisition appeal", "Employment benefits claim", "Civil injunction application"], index) + ` · ${clientsByIndex(index)}`,
  type: pick(caseTypes, index),
  courtName: pick(courts, index),
  courtLocation: pick(["Mumbai, Maharashtra", "New Delhi", "Chennai, Tamil Nadu", "Bengaluru, Karnataka", "Pune, Maharashtra"], index),
  caseNumber: `CS/${2022 + index % 5}/${String(181 + index)}`,
  client: clients[index % clients.length]._id,
  lawyer: lawyers[index % lawyers.length]._id,
  staff: [staff._id],
  opposingParty: `Northstar ${["Holdings", "Developments", "Industries", "Services", "Trading"][index % 5]} Pvt. Ltd.`,
  filingDate: dateOffset(-100 - index * 6),
  nextHearingDate: index % 4 === 0 ? dateOffset(index % 18 + 1) : undefined,
  deadline: index % 3 === 0 ? dateOffset(index % 23 + 1) : undefined,
  priority: pick(["Low", "Medium", "High", "Critical"], index),
  status: pick(caseStatuses, index),
  description: "Synthetic matter record for demonstration. Fictional parties and case details."
})));

const taskItems = [];
for (let index = 0; index < 300; index++) {
  const caseItem = matters[index % matters.length];
  const task = await Task.create({
    title: pick(tasksTitle, index) + ` #${index + 1}`,
    description: "Synthetic task. Confirm scope and supporting records with the assigned team.",
    case: caseItem._id,
    assignedTo: index % 4 === 0 ? staff._id : lawyers[index % lawyers.length]._id,
    createdBy: initialUsers[0]._id,
    startDate: dateOffset(-10 - index % 35),
    dueDate: dateOffset((index % 37) - 8),
    priority: pick(["Low", "Medium", "High", "Critical"], index),
    status: index % 8 === 0 ? "Completed" : pick(["Not Started", "In Progress", "Under Review"], index),
    previousDelayedTasks: index % 5,
    deadlineExtensionCount: index % 6 === 0 ? 1 : 0
  });
  if (task.status !== "Completed") {
    task.risk = await predictRisk({ ...task.toObject(), case: caseItem });
    await task.save();
  }
  taskItems.push(task);
}

await Communication.create(Array.from({ length: 120 }, (_, index) => {
  const caseItem = matters[index % matters.length];
  const client = clients.find((item) => item._id.equals(caseItem.client)) ?? clients[index % clients.length];
  const sender = index % 3 === 0 ? client : lawyers[index % lawyers.length];
  return {
    client: client._id,
    case: caseItem._id,
    sender: sender._id,
    receiver: sender.role === "client" ? caseItem.lawyer : client._id,
    message: ["Follow-up on the next hearing preparation and supporting documents.", "Please review the latest draft and share any corrections.", "We have received the filing confirmation and will keep you updated.", "Internal note: confirm availability before the scheduled conference."][index % 4],
    type: pick(["Email", "Phone Call", "Meeting", "Portal Message", "Other"], index),
    internal: index % 4 === 3 && sender.role !== "client",
    followUpAt: index % 5 === 0 ? dateOffset(index % 12 + 1) : undefined
  };
}));

await Notification.create(Array.from({ length: 120 }, (_, index) => ({
  recipient: [initialUsers[0], lawyers[index % lawyers.length], staff][index % 3]._id,
  title: ["Deadline approaching", "Task assigned", "Hearing scheduled", "Case status updated", "Deadline risk flagged"][index % 5],
  message: `Synthetic workspace alert ${index + 1}: ${pick(tasksTitle, index).toLowerCase()}.`,
  category: ["deadline", "task", "hearing", "case", "risk"][index % 5],
  priority: index % 7 === 0 ? "urgent" : "normal",
  readAt: index % 4 === 0 ? dateOffset(-1) : undefined,
  dedupeKey: `seed-notification-${index + 1}`
})));
await AuditLog.create(Array.from({ length: 30 }, (_, index) => ({
  actor: initialUsers[index % initialUsers.length]._id,
  action: ["case.created", "task.updated", "communication.created", "notification.read"][index % 4],
  entity: ["Case", "Task", "Communication", "Notification"][index % 4],
  entityId: String(matters[index % matters.length]._id),
  detail: "Synthetic demonstration audit event"
})));

console.log(`Seed complete: ${initialUsers.length + 10 + 29} users, ${matters.length} cases, ${taskItems.length} tasks, 120 notifications, 120 communications.`);
console.log("Demo password for all accounts: DemoPass!234");
await (await import("mongoose")).default.disconnect();
