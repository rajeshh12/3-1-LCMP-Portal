import { AuditLog } from "../models/index.js";

export function recordAudit(actor, action, entity, entityId, detail = "") {
  return AuditLog.create({ actor, action, entity, entityId: String(entityId ?? ""), detail });
}
