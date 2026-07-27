import Search from "./Search";

function formatDue(dueAt) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  const label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue · ${label}`, tone: "danger" };
  if (diffDays === 0) return { label: "Due today", tone: "warning" };
  return { label, tone: "neutral" };
}

export default function TaskList({ tasks, error }) {
  return (
    <div id="tasks-section">
      <h3>My Tasks</h3>
      {error && <div id="error">{error}</div>}
      <Search />
      <div id="tasks">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet</p>
            <span>Ask the assistant to create one, or use the search above.</span>
          </div>
        ) : (
          tasks.map((t) => {
            const due = formatDue(t.due_at);
            return (
              <div className={`task${t.status === "done" ? " done" : ""}`} key={t.id}>
                <span className={`status-dot status-${t.status}`} />
                <span className="task-title">{t.title}</span>
                <span className="task-meta">
                  {t.priority === "high" && <span className="badge priority-high">high</span>}
                  {t.priority === "low" && <span className="badge priority-low">low</span>}
                  {due && <span className={`badge due-${due.tone}`}>{due.label}</span>}
                  {t.recurrence && <span className="badge recurrence">&#8635; {t.recurrence}</span>}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
