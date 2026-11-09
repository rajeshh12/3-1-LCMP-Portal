import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth.js";
import portalRouter from "./routes/portal.js";
import { authenticate } from "./middleware/auth.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRouter);
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "legal-portal-api" }));
app.use("/api", authenticate, portalRouter);
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "MulterError") return res.status(400).json({ error: err.message });
  if (err.message?.startsWith("Only PDF, DOC")) return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: "A record with that unique value already exists" });
  if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "An unexpected server error occurred" });
});

export default app;
