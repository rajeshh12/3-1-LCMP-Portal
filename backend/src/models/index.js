import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "lawyer", "staff", "client"], required: true },
  active: { type: Boolean, default: true },
  resetToken: { type: String, select: false },
  resetExpires: { type: Date, select: false }
}, { timestamps: true });

const caseSchema = new Schema({
  caseId: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ["Civil", "Criminal", "Family", "Property", "Corporate", "Labour", "Consumer", "Other"], default: "Civil" },
  courtName: String,
  courtLocation: String,
  caseNumber: String,
  client: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lawyer: { type: Schema.Types.ObjectId, ref: "User" },
  staff: [{ type: Schema.Types.ObjectId, ref: "User" }],
  opposingParty: String,
  filingDate: Date,
  nextHearingDate: Date,
  deadline: Date,
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["New", "Active", "Pending", "Under Review", "Hearing Scheduled", "Completed", "Closed"], default: "New" },
  description: String
}, { timestamps: true });

const taskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  startDate: Date,
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["Not Started", "In Progress", "Under Review", "Completed", "Overdue"], default: "Not Started" },
  completedAt: Date,
  previousDelayedTasks: { type: Number, default: 0 },
  deadlineExtensionCount: { type: Number, default: 0 },
  risk: { probability: Number, category: String, factors: [String], recommendation: String, calculatedAt: Date, daysRemaining: Number, source: String },
  reminderKeys: { type: [String], default: [] }
}, { timestamps: true });
taskSchema.index({ dueDate: 1, status: 1 });

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, enum: ["task", "deadline", "risk", "hearing", "case", "message", "system"], default: "system" },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  link: String,
  readAt: Date,
  dedupeKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const communicationSchema = new Schema({
  client: { type: Schema.Types.ObjectId, ref: "User", required: true },
  case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true, maxlength: 5000 },
  type: { type: String, enum: ["Email", "Phone Call", "Meeting", "Portal Message", "Other"], default: "Portal Message" },
  followUpAt: Date,
  internal: { type: Boolean, default: false }
}, { timestamps: true });

const documentSchema = new Schema({
  case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  category: { type: String, default: "General" }
}, { timestamps: true });

const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  entity: String,
  entityId: String,
  detail: String
}, { timestamps: true });
auditSchema.index({ createdAt: -1 });

export const User = model("User", userSchema);
export const Case = model("Case", caseSchema);
export const Task = model("Task", taskSchema);
export const Notification = model("Notification", notificationSchema);
export const Communication = model("Communication", communicationSchema);
export const Document = model("Document", documentSchema);
export const AuditLog = model("AuditLog", auditSchema);
