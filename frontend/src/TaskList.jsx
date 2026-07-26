export default function TaskList({ tasks, error }) {
  return (
    <div id="tasks-section">
      <h3>My Tasks</h3>
      {error && <div id="error">{error}</div>}
      <div id="tasks">
        {tasks.length === 0 ? (
          <em>No tasks yet.</em>
        ) : (
          tasks.map((t) => (
            <div className="task" key={t.id}>
              {t.title} [{t.status}]
            </div>
          ))
        )}
      </div>
    </div>
  );
}
