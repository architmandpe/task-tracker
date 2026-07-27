import { useState } from "react";
import { createTask } from "./api";

export default function NewTaskModal({ initialTitle = "", onClose, onCreated, onError }) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    const resp = await createTask({
      title: trimmed,
      description: description.trim() || null,
      priority,
      due_at: dueDate ? new Date(dueDate).toISOString() : null,
      recurrence: recurrence || null,
    });
    setSubmitting(false);

    if (!resp.ok) {
      onError("Couldn't create that task. Try again.");
      return;
    }
    onCreated(await resp.json());
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={handleSubmit}>
        <h3 className="modal-title">New task</h3>

        <input
          autoFocus
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="modal-fields">
          <label className="detail-field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="detail-field">
            <span>Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="detail-field">
            <span>Repeats</span>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!title.trim() || submitting}>
            {submitting ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
