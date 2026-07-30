import TaskRow from "./TaskRow";
import { STATUS_LABELS, filterTasks, groupByStatus } from "./taskUtils";

export default function TaskList({ tasks, filter, error, onOpenTask, onToggleDone, onDeleteTask }) {
  const filtered = filterTasks(tasks, filter);
  const groups = groupByStatus(filtered);

  return (
    <div id="tasks-section">
      {error && <div className="banner-error">{error}</div>}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{filter === "done" ? "Nothing completed yet" : "No tasks here"}</p>
          <span>Press <kbd>N</kbd> to create one, or ask the assistant.</span>
        </div>
      ) : (
        groups.map(({ status, tasks: group }) => (
          <div className="task-group" key={status}>
            {groups.length > 1 && (
              <div className="task-group-label">
                {STATUS_LABELS[status]} <span className="nav-count">{group.length}</span>
              </div>
            )}
            <div className="task-group-rows">
              {group.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onOpen={onOpenTask}
                  onToggleDone={onToggleDone}
                  onDelete={onDeleteTask}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
