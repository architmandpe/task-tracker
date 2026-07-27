const ICONS = {
  create_task: "+",
  create_multiple_tasks: "+",
  update_task: "✎",
  update_multiple_tasks: "✎",
  delete_task: "−",
  delete_multiple_tasks: "−",
};

export default function Activity({ entries }) {
  return (
    <div id="activity-section">
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>No activity yet</p>
          <span>Actions the assistant takes on your behalf will show up here.</span>
        </div>
      ) : (
        entries.map((e) => (
          <div className="activity-entry" key={e.id}>
            <span className="activity-icon">{ICONS[e.action] || "•"}</span>
            <span className="activity-summary">{e.summary}</span>
            <span className="activity-time">{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))
      )}
    </div>
  );
}
