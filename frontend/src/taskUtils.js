export const DATE_GROUP_ORDER = ["overdue", "today", "later", "none", "done"];

export const DATE_GROUP_LABELS = {
  overdue: "Overdue",
  today: "Today",
  later: "Later",
  none: "Unscheduled",
  done: "Done",
};

export const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
export const PRIORITY_LABELS = { high: "High", normal: "Normal", low: "Low" };
export const RECURRENCE_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export function formatDue(dueAt, done = false) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  // A finished task is never late - it keeps the date, but drops the verdict.
  if (done) return { label, tone: "neutral" };
  // Both sides are pinned to local midnight before the diff. Comparing a 5pm
  // deadline against midnight rounded a task due this evening up to "tomorrow"
  // and one due yesterday evening down to "today".
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay - today) / 86400000);
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

// Local-time day key (YYYY-MM-DD), the same one the calendar buckets by, so the
// two views never disagree about which day a task falls on. Comparing keys as
// strings also sidesteps DST, where "one day apart" isn't 24h.
function dayKey(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Completed tasks get their own bucket rather than falling into Overdue - a task
// you already finished isn't late.
function dateBucket(task, todayKey) {
  if (task.status === "done") return "done";
  if (!task.due_at) return "none";
  const key = dayKey(new Date(task.due_at));
  if (key < todayKey) return "overdue";
  if (key === todayKey) return "today";
  return "later";
}

function bySoonestThenPriority(a, b) {
  if (a.due_at && b.due_at) {
    const diff = new Date(a.due_at) - new Date(b.due_at);
    if (diff !== 0) return diff;
  } else if (a.due_at !== b.due_at) {
    return a.due_at ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.title.localeCompare(b.title);
}

// Groups the list view by when a task is due. Status grouping left 13 same-status
// tasks as one undifferentiated wall; the deadline is what the list is scanned for.
export function groupByDate(tasks) {
  const todayKey = dayKey(new Date());
  const groups = { overdue: [], today: [], later: [], none: [], done: [] };
  for (const t of tasks) {
    groups[dateBucket(t, todayKey)].push(t);
  }
  for (const list of Object.values(groups)) list.sort(bySoonestThenPriority);
  return DATE_GROUP_ORDER.filter((g) => groups[g].length).map((g) => ({ group: g, tasks: groups[g] }));
}
