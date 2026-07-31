import { formatDue } from "./taskUtils";
import { IconCheckCircle, IconTrash } from "./Icons";

export default function TaskRow({ task, onOpen, onToggleDone, onDelete }) {
  const done = task.status === "done";
  const due = formatDue(task.due_at, done);

  return (
    <div className={`task${done ? " done" : ""}`} onClick={() => onOpen(task.id)}>
      <button
        className={`task-check status-${task.status}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        title={done ? "Mark as todo" : "Mark as done"}
      >
        {done && <IconCheckCircle className="icon-xs" />}
      </button>
      <span className="task-title">{task.title}</span>
      <span className="task-meta">
        {task.priority === "high" && <span className="badge priority-high">High</span>}
        {task.priority === "low" && <span className="badge priority-low">Low</span>}
        {due && <span className={`badge due-${due.tone}`}>{due.label}</span>}
        {task.recurrence && <span className="badge recurrence">&#8635; {task.recurrence}</span>}
      </span>
      <button
        className="task-delete"
        onClick={(e) => {
          // The row itself opens the detail panel.
          e.stopPropagation();
          onDelete(task);
        }}
        title={`Delete "${task.title}"`}
        aria-label={`Delete "${task.title}"`}
      >
        <IconTrash className="icon-xs" />
      </button>
    </div>
  );
}
