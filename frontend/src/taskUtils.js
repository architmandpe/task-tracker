export const STATUS_ORDER = ["in_progress", "todo", "done"];

export const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
export const PRIORITY_LABELS = { high: "High", normal: "Normal", low: "Low" };
export const RECURRENCE_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export function formatDue(dueAt) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  const label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue · ${label}`, tone: "danger" };
  if (diffDays === 0) return { label: "Due today", tone: "warning" };
  if (diffDays === 1) return { label: "Due tomorrow", tone: "neutral" };
  return { label, tone: "neutral" };
}

// Formats a Date/ISO string for a <input type="date"> value (local, not UTC-shifted).
export function toDateInputValue(dueAt) {
  if (!dueAt) return "";
  const d = new Date(dueAt);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function filterTasks(tasks, filter) {
  if (filter === "active") return tasks.filter((t) => t.status !== "done");
  if (filter === "done") return tasks.filter((t) => t.status === "done");
  return tasks;
}

export function groupByStatus(tasks) {
  const groups = { in_progress: [], todo: [], done: [] };
  for (const t of tasks) {
    (groups[t.status] || (groups[t.status] = [])).push(t);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pr !== 0) return pr;
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at) - new Date(b.due_at);
    });
  }
  return STATUS_ORDER.filter((s) => groups[s]?.length).map((s) => ({ status: s, tasks: groups[s] }));
}
