import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { z } from "zod";
import { User } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(8) });

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+password");
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/register", async (req, res) => {
  const schema = z.object({ name: z.string().min(2), email: z.email(), password: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please provide a valid name, email and password (at least 10 characters)" });
  const user = await User.create({ ...parsed.data, role: "client", password: await bcrypt.hash(parsed.data.password, 12) });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/forgot-password", async (req, res) => {
  const email = z.email().safeParse(req.body.email);
  if (!email.success) return res.status(400).json({ error: "Enter a valid email" });
  const user = await User.findOne({ email: email.data.toLowerCase() });
  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    user.resetToken = crypto.createHash("sha256").update(raw).digest("hex");
    user.resetExpires = Date.now() + 3600000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173"}/reset-password?token=${raw}`;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: "Reset your Briefcase password", text: `Use this link within one hour to reset your password: ${resetUrl}` });
    } else if (process.env.NODE_ENV !== "production") {
      console.info(`Development password reset link: ${resetUrl}`);
    }
  }
  res.json({ message: "If the account exists, password reset instructions will be sent." });
});

router.post("/reset-password", async (req, res) => {
  const parsed = z.object({ token: z.string().min(1), password: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A reset token and password of at least 10 characters are required" });
  const digest = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const user = await User.findOne({ resetToken: digest, resetExpires: { $gt: Date.now() } }).select("+password +resetToken +resetExpires");
  if (!user) return res.status(400).json({ error: "Password reset token is invalid or expired" });
  user.password = await bcrypt.hash(parsed.data.password, 12);
  user.resetToken = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ message: "Password updated" });
});

router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));
export default router;
