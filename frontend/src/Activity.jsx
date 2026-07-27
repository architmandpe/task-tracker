export default function Activity({ entries }) {
  return (
    <div id="activity-section">
      <h3>Recent Activity</h3>
      {entries.length === 0 ? (
        <em>No actions yet.</em>
      ) : (
        entries.map((e) => (
          <div className="activity-entry" key={e.id}>
            <span className="activity-summary">{e.summary}</span>
            <span className="activity-time">{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))
      )}
    </div>
  );
}
