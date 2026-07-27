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
      <h3>Recent Activity</h3>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>No activity yet</p>
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
