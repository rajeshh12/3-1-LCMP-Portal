import test from "node:test";
import assert from "node:assert/strict";
import { predictRisk } from "../src/services/risk.js";
import { daysUntil } from "../src/utils/dates.js";

test("risk prediction is deterministic and categorizes a distant low workload task", async () => {
  const now = new Date();
  const prediction = await predictRisk({
    dueDate: new Date(now.getTime() + 40 * 86400000),
    priority: "Low",
    status: "In Progress",
    previousDelayedTasks: 0,
    deadlineExtensionCount: 0,
    createdAt: now,
    updatedAt: now,
    case: { type: "Civil", priority: "Low", createdAt: now }
  });
  assert.equal(prediction.category, "LOW RISK");
  assert.ok(prediction.probability >= 0 && prediction.probability <= 1);
});

test("risk prediction classifies overdue critical work as high and explains the pressure", async () => {
  const now = new Date();
  const prediction = await predictRisk({
    dueDate: new Date(now.getTime() - 86400000),
    priority: "Critical",
    status: "Not Started",
    previousDelayedTasks: 4,
    deadlineExtensionCount: 2,
    createdAt: now,
    updatedAt: now,
    case: { type: "Civil", priority: "Critical", createdAt: now }
  });

  test("calendar-day differences use Asia/Kolkata rather than the host timezone", () => {
    assert.equal(daysUntil(new Date("2025-01-02T00:00:00.000Z"), new Date("2025-01-01T19:00:00.000Z")), 0);
    assert.equal(daysUntil(new Date("2025-01-02T18:31:00.000Z"), new Date("2025-01-01T19:00:00.000Z")), 1);
  });
  assert.equal(prediction.category, "HIGH RISK");
  assert.ok(prediction.factors.includes("Multiple previous delayed tasks"));
  assert.match(prediction.recommendation, /immediate action/i);
});
