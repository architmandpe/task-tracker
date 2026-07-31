import { useState } from "react";
import { createTask } from "./api";
import Select from "./Select";
import DatePicker from "./DatePicker";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", dot: "var(--border-strong)" },
  { value: "normal", label: "Normal", dot: "var(--accent)" },
  { value: "high", label: "High", dot: "var(--danger)" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function NewTaskModal({ initialTitle = "", initialDueDate = "", onClose, onCreated, onError }) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState(initialDueDate);
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
          <div className="detail-field">
            <span>Priority</span>
            <Select ariaLabel="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
          </div>
          <div className="detail-field">
            <span>Due date</span>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>
          <div className="detail-field">
            <span>Repeats</span>
            <Select ariaLabel="Repeats" value={recurrence} options={RECURRENCE_OPTIONS} onChange={setRecurrence} />
          </div>
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
