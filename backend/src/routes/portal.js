import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { allowRoles } from "../middleware/auth.js";
import { AuditLog, Case, Communication, Document, Notification, Task, User } from "../models/index.js";
import { recordAudit } from "../services/audit.js";
import { notify } from "../services/notifications.js";
import { predictRisk } from "../services/risk.js";

const router = Router();
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, done) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
    done(allowed.includes(file.mimetype) ? null : new Error("Only PDF, DOC, DOCX, JPG and PNG files are allowed"), allowed.includes(file.mimetype));
  }
});
const idParam = (req) => /^[a-f\d]{24}$/i.test(req.params.id);
const isPrivileged = (role) => ["admin", "lawyer", "staff"].includes(role);
const objectId = z.string().regex(/^[a-f\d]{24}$/i);

function scopeCases(user) {
  if (user.role === "admin") return {};
  if (user.role === "client") return { client: user._id };
  if (user.role === "lawyer") return { lawyer: user._id };
  return { $or: [{ staff: user._id }, { lawyer: user._id }] };
}

function invalidateRisk(assignedTo) {
  if (!assignedTo) return Promise.resolve();
  return Task.updateMany({ assignedTo, status: { $ne: "Completed" } }, { $unset: { "risk.calculatedAt": 1 } });
}

router.get("/dashboard", async (req, res) => {
  const caseFilter = scopeCases(req.user);
  const caseIds = await Case.find(caseFilter).distinct("_id");
  const taskFilter = { case: { $in: caseIds } };
  const [cases, tasks, clients, lawyers, notifications] = await Promise.all([
    Case.find(caseFilter).select("status type priority title deadline nextHearingDate lawyer createdAt").populate("lawyer", "name").lean(),
    Task.find(taskFilter).select("status dueDate priority title case assignedTo risk").populate("case", "title").populate("assignedTo", "name").lean(),
    req.user.role === "admin" ? User.countDocuments({ role: "client" }) : Case.distinct("client", { _id: { $in: caseIds } }).then((items) => items.length),
    req.user.role === "admin" ? User.countDocuments({ role: "lawyer" }) : Case.distinct("lawyer", { _id: { $in: caseIds } }).then((items) => items.length),
    Notification.countDocuments({ recipient: req.user._id, readAt: null })
  ]);
  const statusCounts = Object.fromEntries(["New", "Active", "Pending", "Under Review", "Hearing Scheduled", "Completed", "Closed"].map((status) => [status, cases.filter((item) => item.status === status).length]));
  const typeCounts = Object.fromEntries([...new Set(cases.map((item) => item.type))].map((type) => [type, cases.filter((item) => item.type === type).length]));
  const overdue = tasks.filter((task) => task.status !== "Completed" && new Date(task.dueDate) < new Date());
  const highRisk = tasks.filter((task) => task.risk?.category === "HIGH RISK");
  res.json({
    kpis: { totalCases: cases.length, activeCases: cases.filter((item) => item.status === "Active").length, pendingCases: cases.filter((item) => item.status === "Pending").length, closedCases: cases.filter((item) => item.status === "Closed").length, totalClients: clients, totalLawyers: lawyers, pendingTasks: tasks.filter((task) => task.status !== "Completed").length, overdueTasks: overdue.length, upcomingDeadlines: tasks.filter((task) => task.status !== "Completed" && new Date(task.dueDate) >= new Date() && new Date(task.dueDate) < Date.now() + 7 * 86400000).length, highRiskDeadlines: highRisk.length },
    casesByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    casesByType: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
    taskCompletion: tasks.length ? Math.round(tasks.filter((task) => task.status === "Completed").length / tasks.length * 100) : 0,
    riskDistribution: ["LOW RISK", "MEDIUM RISK", "HIGH RISK"].map((name) => ({ name, value: tasks.filter((task) => task.risk?.category === name).length })),
    lawyerWorkload: Object.values(tasks.reduce((acc, task) => {
      const name = task.assignedTo?.name ?? "Unassigned";
      acc[name] ??= { name, value: 0 };
      if (task.status !== "Completed") acc[name].value++;
      return acc;
    }, {})),
    upcoming: tasks.filter((task) => task.status !== "Completed").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8),
    unreadNotifications: notifications
  });
});

router.get("/cases", async (req, res) => {
  const filter = scopeCases(req.user);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [...(filter.$or ?? []), { title: new RegExp(escaped, "i") }, { caseNumber: new RegExp(escaped, "i") }];
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [items, total] = await Promise.all([Case.find(filter).populate("client lawyer staff", "name email").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit), Case.countDocuments(filter)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.post("/cases", allowRoles("admin", "lawyer"), async (req, res) => {
  const parsed = z.object({ title: z.string().min(2), client: objectId, type: z.string().optional(), status: z.string().optional(), priority: z.string().optional(), lawyer: objectId.optional(), staff: z.array(objectId).optional(), description: z.string().optional(), caseNumber: z.string().optional(), courtName: z.string().optional(), courtLocation: z.string().optional(), opposingParty: z.string().optional(), filingDate: z.coerce.date().optional(), nextHearingDate: z.coerce.date().optional(), deadline: z.coerce.date().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Case title and client are required" });
  if (!(await User.exists({ _id: parsed.data.client, role: "client" }))) return res.status(400).json({ error: "Select a valid client account" });
  if (parsed.data.lawyer && !(await User.exists({ _id: parsed.data.lawyer, role: "lawyer", active: true }))) return res.status(400).json({ error: "Select a valid lawyer account" });
  if (parsed.data.staff?.length && (await User.countDocuments({ _id: { $in: parsed.data.staff }, role: "staff", active: true })) !== parsed.data.staff.length) return res.status(400).json({ error: "Select valid staff accounts" });
  const item = await Case.create({ ...parsed.data, caseId: `LC-${randomUUID().slice(0, 8).toUpperCase()}` });
  await recordAudit(req.user.id, "case.created", "Case", item.id, item.title);
  res.status(201).json(item);
});

router.get("/cases/:id", async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid case identifier" });
  const item = await Case.findOne({ _id: req.params.id, ...scopeCases(req.user) }).populate("client lawyer staff", "name email role");
  if (!item) return res.status(404).json({ error: "Case not found" });
  const [tasks, communications, documents] = await Promise.all([
    Task.find({ case: item.id }).populate("assignedTo createdBy", "name"),
    Communication.find({ case: item.id, ...(req.user.role === "client" ? { internal: false } : {}) }).populate("client sender receiver", "name role"),
    Document.find({ case: item.id }).populate("uploadedBy", "name")
  ]);
  res.json({ case: item, tasks, communications, documents });
});

router.patch("/cases/:id", allowRoles("admin", "lawyer"), async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid case identifier" });
  const parsed = z.object({
    title: z.string().min(2).optional(),
    client: objectId.optional(),
    type: z.enum(["Civil", "Criminal", "Family", "Property", "Corporate", "Labour", "Consumer", "Other"]).optional(),
    status: z.enum(["New", "Active", "Pending", "Under Review", "Hearing Scheduled", "Completed", "Closed"]).optional(),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
    lawyer: objectId.optional(),
    staff: z.array(objectId).optional(),
    description: z.string().optional(),
    caseNumber: z.string().optional(),
    courtName: z.string().optional(),
    courtLocation: z.string().optional(),
    opposingParty: z.string().optional(),
    filingDate: z.coerce.date().optional(),
    nextHearingDate: z.coerce.date().optional(),
    deadline: z.coerce.date().optional()
  }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Case update contains invalid fields" });
  if (parsed.data.client && !(await User.exists({ _id: parsed.data.client, role: "client" }))) return res.status(400).json({ error: "Select a valid client account" });
  if (parsed.data.lawyer && !(await User.exists({ _id: parsed.data.lawyer, role: "lawyer", active: true }))) return res.status(400).json({ error: "Select a valid lawyer account" });
  if (parsed.data.staff?.length && (await User.countDocuments({ _id: { $in: parsed.data.staff }, role: "staff", active: true })) !== parsed.data.staff.length) return res.status(400).json({ error: "Select valid staff accounts" });
  const item = await Case.findOneAndUpdate({ _id: req.params.id, ...scopeCases(req.user) }, parsed.data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Case not found" });
  await Task.updateMany({ case: item.id, status: { $ne: "Completed" } }, { $unset: { "risk.calculatedAt": 1 } });
  if (parsed.data.lawyer || parsed.data.staff) {
    const assigned = [...new Set([parsed.data.lawyer, ...(parsed.data.staff ?? [])].filter(Boolean))];
    await Promise.all(assigned.map((recipient) => notify(recipient, {
      title: "Case assignment updated",
      message: item.title,
      category: "case",
      priority: "normal",
      link: `/cases/${item.id}`,
      dedupeKey: `case:${item.id}:assigned:${recipient}:${item.updatedAt.getTime()}`
    })));
  }
  await recordAudit(req.user.id, "case.updated", "Case", item.id, item.title);
  res.json(item);
});

router.delete("/cases/:id", allowRoles("admin"), async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid case identifier" });
  const item = await Case.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Case not found" });
  const [tasks, documents] = await Promise.all([
    Task.find({ case: item.id }).select("_id"),
    Document.find({ case: item.id }).select("storedName")
  ]);
  const taskIds = tasks.map((task) => task.id);
  await Promise.all([
    Task.deleteMany({ case: item.id }),
    Communication.deleteMany({ case: item.id }),
    Document.deleteMany({ case: item.id }),
    Notification.deleteMany({ $or: [
      { dedupeKey: { $regex: `^case:${item.id}:` } },
      { dedupeKey: { $in: taskIds.flatMap((id) => [`task:${id}:assigned`, `task:${id}:completed`]) } },
      { dedupeKey: { $regex: `^task:(${taskIds.join("|")}):` } }
    ] })
  ]);
  await item.deleteOne();
  await Promise.all(documents.map(async (document) => {
    try { await unlink(path.resolve(uploadDirectory, document.storedName)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }));
  await recordAudit(req.user.id, "case.deleted", "Case", item.id, item.title);
  res.json({ message: "Case deleted" });
});

router.get("/tasks", async (req, res) => {
  const filter = {};
  if (req.user.role === "client") filter.case = { $in: await Case.find({ client: req.user.id }).distinct("_id") };
  else if (req.user.role === "lawyer") filter.case = { $in: await Case.find({ lawyer: req.user.id }).distinct("_id") };
  else if (req.user.role === "staff") filter.assignedTo = req.user.id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo && isPrivileged(req.user.role)) filter.assignedTo = req.query.assignedTo;
  const items = await Task.find(filter).populate("case", "title caseId type priority nextHearingDate").populate("assignedTo createdBy", "name role").sort({ dueDate: 1 });
  const taskStats = items.reduce((all, task) => {
    const id = task.assignedTo?.id;
    if (!id) return all;
    all[id] ??= { total: 0, pending: 0, completed: 0 };
    all[id].total++;
    if (task.status === "Completed") all[id].completed++;
    else all[id].pending++;
    return all;
  }, {});
  const scored = await Promise.all(items.map(async (task) => {
    if (task.status !== "Completed" && (!task.risk?.calculatedAt || Date.now() - new Date(task.risk.calculatedAt) > 3600000)) {
      const stats = taskStats[task.assignedTo?.id] ?? {};
      const risk = await predictRisk({ ...task.toObject(), workload: stats.pending, pendingCount: stats.pending, completionRate: stats.total ? stats.completed / stats.total : 1 });
      task.risk = risk;
      await task.save();
      if (risk.category === "HIGH RISK" && task.assignedTo) {
        await notify(task.assignedTo._id, {
          title: "High-risk deadline",
          message: `${task.title} — ${task.case?.title ?? "case"} (${Math.round(risk.probability * 100)}% estimated risk)`,
          category: "risk",
          priority: "urgent",
          link: "/risk",
          dedupeKey: `task:${task.id}:high-risk`
        });
      }
    }
    return task;
  }));
  res.json(scored);
});

router.get("/tasks/:id", async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid task identifier" });
  const task = await Task.findById(req.params.id).populate("case", "title caseId type priority nextHearingDate deadline").populate("assignedTo createdBy", "name email role");
  if (!task || !(await Case.exists({ _id: task.case.id, ...scopeCases(req.user) }))) return res.status(404).json({ error: "Task not found" });
  if (req.user.role === "staff" && task.assignedTo.id !== req.user.id) return res.status(403).json({ error: "You cannot view this task" });
  if (task.status !== "Completed" && !task.risk?.calculatedAt) {
    task.risk = await predictRisk(task);
    await task.save();
  }
  res.json(task);
});

router.post("/tasks", allowRoles("admin", "lawyer"), async (req, res) => {
  const parsed = z.object({ title: z.string().min(2), case: objectId, assignedTo: objectId, dueDate: z.coerce.date(), description: z.string().optional(), priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(), startDate: z.coerce.date().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Task title, case, assignee and due date are required" });
  const caseItem = await Case.findOne({ _id: parsed.data.case, ...scopeCases(req.user) });
  if (!caseItem) return res.status(404).json({ error: "Case not found or inaccessible" });
  if (!(await User.exists({ _id: parsed.data.assignedTo, role: { $in: ["lawyer", "staff"] }, active: true }))) return res.status(400).json({ error: "Select an active lawyer or staff account" });
  const item = await Task.create({ ...parsed.data, createdBy: req.user.id });
  const risk = await predictRisk({ ...item.toObject(), case: caseItem });
  item.risk = risk;
  await item.save();
  await invalidateRisk(item.assignedTo);
  await notify(item.assignedTo, { title: "New task assigned", message: item.title, category: "task", priority: "normal", link: "/tasks", dedupeKey: `task:${item.id}:assigned` });
  await recordAudit(req.user.id, "task.created", "Task", item.id, item.title);
  res.status(201).json(item);
});

router.patch("/tasks/:id", async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid task identifier" });
  const item = await Task.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Task not found" });
  const relatedCase = await Case.findOne({ _id: item.case, ...scopeCases(req.user) });
  const canManage = ["admin", "lawyer"].includes(req.user.role);
  if (!relatedCase || (!canManage && item.assignedTo.toString() !== req.user.id)) return res.status(403).json({ error: "You cannot update this task" });
  const previousAssignee = item.assignedTo.toString();
  const allowedFields = canManage ? ["title", "description", "assignedTo", "dueDate", "priority", "status"] : ["status"];
  for (const field of allowedFields) if (req.body[field] !== undefined) item[field] = req.body[field];
  if (req.body.assignedTo && !(await User.exists({ _id: req.body.assignedTo, role: { $in: ["lawyer", "staff"] }, active: true }))) return res.status(400).json({ error: "Select an active lawyer or staff account" });
  if (item.status === "Completed") item.completedAt = new Date();
  else item.completedAt = undefined;
  item.risk = item.status === "Completed" ? item.risk : await predictRisk({ ...item.toObject(), case: relatedCase });
  await item.save();
  await Promise.all([invalidateRisk(previousAssignee), invalidateRisk(item.assignedTo)]);
  if (item.status === "Completed") {
    await notify(item.createdBy, { title: "Task completed", message: item.title, category: "task", priority: "normal", link: "/tasks", dedupeKey: `task:${item.id}:completed:${item.completedAt.getTime()}` });
  }
  await recordAudit(req.user.id, "task.updated", "Task", item.id, item.title);
  res.json(item);
});

router.delete("/tasks/:id", allowRoles("admin", "lawyer"), async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid task identifier" });
  const item = await Task.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: "Task not found" });
  await Notification.deleteMany({ dedupeKey: { $regex: `^task:${item.id}:` } });
  await invalidateRisk(item.assignedTo);
  await recordAudit(req.user.id, "task.deleted", "Task", item.id, item.title);
  res.json({ message: "Task deleted" });
});

router.get("/users", allowRoles("admin"), async (req, res) => res.json(await User.find().select("name email role active createdAt").sort("name")));
router.get("/team", allowRoles("admin", "lawyer", "staff"), async (req, res) => {
  const filter = { role: { $in: ["lawyer", "staff"] }, active: true };
  if (req.user.role === "lawyer") filter._id = { $in: [req.user._id, ...(await Case.find({ lawyer: req.user.id }).distinct("staff"))] };
  if (req.user.role === "staff") filter._id = req.user.id;
  res.json(await User.find(filter).select("name email role").sort("name"));
});
router.post("/users", allowRoles("admin"), async (req, res) => {
  const parsed = z.object({ name: z.string().min(2), email: z.email(), password: z.string().min(10), role: z.enum(["admin", "lawyer", "staff", "client"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide a valid name, email, password and role" });
  const bcrypt = (await import("bcryptjs")).default;
  const item = await User.create({ ...parsed.data, password: await bcrypt.hash(parsed.data.password, 12) });
  await recordAudit(req.user.id, "user.created", "User", item.id, item.email);
  res.status(201).json({ id: item.id, name: item.name, email: item.email, role: item.role });
});
router.patch("/users/:id", allowRoles("admin"), async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid user identifier" });
  if (req.params.id === req.user.id && req.body.active === false) return res.status(400).json({ error: "You cannot deactivate your own account" });
  const parsed = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(["admin", "lawyer", "staff", "client"]).optional(),
    active: z.boolean().optional()
  }).strict().safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data ?? {}).length) return res.status(400).json({ error: "Provide a valid name, role or active status" });
  const existing = await User.findById(req.params.id).select("name email role active createdAt");
  if (!existing) return res.status(404).json({ error: "User not found" });
  if (parsed.data.role && parsed.data.role !== existing.role) {
    if (existing.id === req.user.id) return res.status(400).json({ error: "You cannot change your own role" });
    const assigned = existing.role === "client"
      ? await Case.exists({ client: existing.id })
      : existing.role === "lawyer"
        ? await Case.exists({ lawyer: existing.id })
        : existing.role === "staff"
          ? await Case.exists({ staff: existing.id })
          : null;
    const hasTasks = ["lawyer", "staff"].includes(existing.role) && await Task.exists({ assignedTo: existing.id });
    if (assigned || hasTasks) return res.status(409).json({ error: "Remove this user's case and task assignments before changing their role" });
  }
  const item = await User.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true }).select("name email role active createdAt");
  if (!item) return res.status(404).json({ error: "User not found" });
  await recordAudit(req.user.id, "user.updated", "User", item.id, item.email);
  res.json(item);
});
router.get("/clients", async (req, res) => {
  const filter = { role: "client" };
  if (req.user.role === "client") filter._id = req.user.id;
  else if (req.user.role === "lawyer") filter._id = { $in: await Case.find({ lawyer: req.user.id }).distinct("client") };
  else if (req.user.role === "staff") filter._id = { $in: await Case.find({ staff: req.user.id }).distinct("client") };
  res.json(await User.find(filter).select("name email createdAt").sort("name"));
});
router.get("/notifications", async (req, res) => res.json(await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(100)));
router.patch("/notifications/read-all", async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, readAt: null }, { readAt: new Date() });
  res.json({ message: "All notifications marked as read" });
});
router.patch("/notifications/:id/read", async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { readAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ error: "Notification not found" });
  res.json(item);
});
router.get("/communications", async (req, res) => {
  const cases = await Case.find(scopeCases(req.user)).distinct("_id");
  const filter = { case: { $in: cases }, ...(req.user.role === "client" ? { internal: false } : {}) };
  res.json(await Communication.find(filter).populate("client case sender receiver", "name title caseId role").sort({ createdAt: -1 }).limit(200));
});
router.post("/communications", async (req, res) => {
  const parsed = z.object({ case: objectId, message: z.string().min(1).max(5000), type: z.enum(["Email", "Phone Call", "Meeting", "Portal Message", "Other"]).default("Portal Message"), followUpAt: z.coerce.date().optional(), internal: z.boolean().default(false) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Case and message are required" });
  if (req.user.role === "client" && parsed.data.internal) return res.status(403).json({ error: "Clients cannot create internal notes" });
  const itemCase = await Case.findOne({ _id: parsed.data.case, ...scopeCases(req.user) });
  if (!itemCase) return res.status(404).json({ error: "Case not found or inaccessible" });
  const item = await Communication.create({ ...parsed.data, client: itemCase.client, sender: req.user.id, receiver: req.user.role === "client" ? itemCase.lawyer : itemCase.client });
  if (req.user.role === "client" && itemCase.lawyer) await notify(itemCase.lawyer, { title: "Client message received", message: item.message.slice(0, 160), category: "message", priority: "normal", link: "/communications", dedupeKey: `communication:${item.id}` });
  await recordAudit(req.user.id, "communication.created", "Communication", item.id);
  res.status(201).json(item);
});
router.get("/documents", async (req, res) => {
  const cases = await Case.find(scopeCases(req.user)).distinct("_id");
  res.json(await Document.find({ case: { $in: cases } }).populate("case uploadedBy", "title caseId name").sort({ createdAt: -1 }));
});
router.post("/documents", allowRoles("admin", "lawyer", "staff"), upload.single("file"), async (req, res) => {
  if (!req.file || !req.body.case) return res.status(400).json({ error: "A document and case are required" });
  const itemCase = await Case.findOne({ _id: req.body.case, ...scopeCases(req.user) });
  if (!itemCase) return res.status(404).json({ error: "Case not found or inaccessible" });
  const item = await Document.create({ case: itemCase.id, uploadedBy: req.user.id, originalName: path.basename(req.file.originalname), storedName: req.file.filename, mimeType: req.file.mimetype, size: req.file.size, category: req.body.category || "General" });
  res.status(201).json(item);
});
router.get("/documents/:id/download", async (req, res) => {
  if (!idParam(req)) return res.status(400).json({ error: "Invalid document identifier" });
  const item = await Document.findById(req.params.id);
  if (!item || !(await Case.exists({ _id: item.case, ...scopeCases(req.user) }))) return res.status(404).json({ error: "Document not found" });
  res.download(path.resolve(uploadDirectory, item.storedName), item.originalName, { headers: { "Content-Type": item.mimeType } });
});
router.get("/risk", async (req, res) => {
  const caseIds = await Case.find(scopeCases(req.user)).distinct("_id");
  const allTasks = await Task.find({ case: { $in: caseIds } }).select("assignedTo status");
  const tasks = await Task.find({ case: { $in: caseIds }, status: { $ne: "Completed" } }).populate("case", "title type priority nextHearingDate").populate("assignedTo", "name").sort({ dueDate: 1 });
  const taskStats = allTasks.reduce((all, task) => {
    const id = String(task.assignedTo);
    if (!id) return all;
    all[id] ??= { total: 0, pending: 0, completed: 0 };
    all[id].total++;
    task.status === "Completed" ? all[id].completed++ : all[id].pending++;
    return all;
  }, {});
  res.json(await Promise.all(tasks.map(async (task) => {
    const stats = taskStats[task.assignedTo?.id] ?? {};
    const risk = await predictRisk({ ...task.toObject(), workload: stats.pending, pendingCount: stats.pending, completionRate: stats.total ? stats.completed / stats.total : 1 });
    task.risk = risk;
    await task.save();
    if (risk.category === "HIGH RISK" && task.assignedTo) {
      await notify(task.assignedTo._id, {
        title: "High-risk deadline",
        message: `${task.title} — ${task.case?.title ?? "case"} (${Math.round(risk.probability * 100)}% estimated risk)`,
        category: "risk",
        priority: "urgent",
        link: "/risk",
        dedupeKey: `task:${task.id}:high-risk`
      });
    }
    return { task, risk };
  })));
});
router.get("/audit", allowRoles("admin"), async (req, res) => res.json(await AuditLog.find().populate("actor", "name email").sort({ createdAt: -1 }).limit(200)));
router.get("/calendar", async (req, res) => {
  const cases = await Case.find(scopeCases(req.user)).select("title caseId nextHearingDate deadline");
  const tasks = await Task.find({ case: { $in: cases.map((item) => item.id) } }).populate("case", "title");
  res.json([
    ...cases.flatMap((item) => [
      ...(item.nextHearingDate ? [{ id: `${item.id}-hearing`, title: `Hearing: ${item.title}`, date: item.nextHearingDate, type: "hearing" }] : []),
      ...(item.deadline ? [{ id: `${item.id}-deadline`, title: `Case deadline: ${item.title}`, date: item.deadline, type: "deadline" }] : [])
    ]),
    ...tasks.map((item) => ({ id: item.id, title: item.title, date: item.dueDate, type: "task", status: item.status }))
  ]);
});

export default router;
