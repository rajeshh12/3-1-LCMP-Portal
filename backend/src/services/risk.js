import { daysUntil } from "../utils/dates.js";

const DAYS = 86400000;
const LOW_THRESHOLD = Number(process.env.RISK_LOW_THRESHOLD || 0.3);
const HIGH_THRESHOLD = Number(process.env.RISK_HIGH_THRESHOLD || 0.65);

export async function predictRisk(task) {
  const due = new Date(task.dueDate);
  const days = daysUntil(due);
  const factors = [];
  let score = 0.08;
  let source = "Local rules fallback";
  if (days <= 1) { score += 0.35; factors.push("Very little time remaining"); }
  else if (days <= 3) { score += 0.23; factors.push("Deadline is within three days"); }
  else if (days <= 7) { score += 0.12; factors.push("Deadline is within one week"); }
  if (task.previousDelayedTasks >= 2) { score += 0.18; factors.push("Multiple previous delayed tasks"); }
  if (task.deadlineExtensionCount > 0) { score += Math.min(0.16, task.deadlineExtensionCount * 0.08); factors.push("Deadline extension history"); }
  if ((task.workload ?? 0) >= 12) { score += 0.12; factors.push("High lawyer workload"); }
  else if ((task.workload ?? 0) >= 7) { score += 0.06; factors.push("Elevated lawyer workload"); }
  if ((task.pendingCount ?? 0) >= 10) { score += 0.10; factors.push("Many pending tasks"); }
  else if ((task.pendingCount ?? 0) >= 5) { score += 0.05; factors.push("Several pending tasks"); }
  if ((task.completionRate ?? 1) < 0.4) { score += 0.12; factors.push("Low task completion rate"); }
  if (task.priority === "Critical" || task.priority === "High") score += 0.06;
  if (task.status === "Not Started" && days <= 7) { score += 0.15; factors.push("Task has not been started"); }
  let probability = Math.max(0.02, Math.min(0.98, score));
  const mlUrl = process.env.ML_SERVICE_URL;
  if (mlUrl) {
    try {
      const response = await fetch(`${mlUrl}/predict`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          Case_Type: task.case?.type ?? "Other",
          Case_Priority: task.case?.priority ?? "Medium",
          Task_Priority: task.priority,
          Days_Until_Deadline: Math.max(-30, days),
          Days_Task_Remained_Open: Math.max(0, Math.floor((Date.now() - new Date(task.createdAt).getTime()) / DAYS)),
          Previous_Delayed_Tasks: task.previousDelayedTasks,
          Lawyer_Current_Workload: task.workload ?? 0,
          Staff_Current_Workload: 0,
          Pending_Tasks_Count: task.pendingCount ?? 0,
          Case_Age_Days: task.case?.createdAt ? Math.floor((Date.now() - new Date(task.case.createdAt).getTime()) / DAYS) : 0,
          Deadline_Extension_Count: task.deadlineExtensionCount,
          Task_Completion_Rate: task.completionRate ?? 0.5,
          Upcoming_Hearing: Boolean(task.case?.nextHearingDate),
          Days_Since_Last_Update: Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / DAYS),
          Task_Status: task.status
        }),
        signal: AbortSignal.timeout(1500)
      });
      if (response.ok) {
        const prediction = await response.json();
        probability = prediction.probability;
        source = `${prediction.source} (synthetic model)`;
      }
    } catch (error) {
      if (error.name !== "TimeoutError" && error.cause?.code !== "ECONNREFUSED" && error.code !== "ECONNREFUSED" && error.name !== "TypeError") throw error;
    }
  }
  const category = probability < LOW_THRESHOLD ? "LOW RISK" : probability < HIGH_THRESHOLD ? "MEDIUM RISK" : "HIGH RISK";
  if (!factors.length) factors.push("No immediate deadline risk indicators");
  const recommendation = category === "HIGH RISK"
    ? "Send an urgent notification and take immediate action."
    : category === "MEDIUM RISK"
      ? "Notify the assigned lawyer and monitor progress."
      : "Continue regular monitoring.";
  return { probability, category, factors, recommendation, calculatedAt: new Date(), daysRemaining: days, source };
}
