import { useEffect, useRef, useState } from "react";
import { updateTask, deleteTask } from "./api";
import { toDateInputValue } from "./taskUtils";
import { IconX, IconTrash } from "./Icons";

export default function TaskDetailPanel({ task, onClose, onUpdated, onDeleted, onError }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setConfirmingDelete(false);
    panelRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function save(fields) {
    const resp = await updateTask(task.id, fields);
    if (!resp.ok) {
      onError("Couldn't save that change. Try again.");
      return;
    }
    onUpdated(await resp.json());
  }

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) save({ title: trimmed });
  }

  function saveDescription() {
    const next = description.trim() || null;
    if (next !== (task.description || null)) save({ description: next });
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    const resp = await deleteTask(task.id);
    setDeleting(false);
    if (!resp.ok) {
      onError("Couldn't delete that task. Try again.");
      return;
    }
    onDeleted(task.id);
  }

  return (
    <div className="detail-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel" ref={panelRef} tabIndex={-1}>
        <div className="detail-header">
          <button className="icon-button" onClick={onClose} title="Close (Esc)">
            <IconX className="icon" />
          </button>
        </div>

        <textarea
          className="detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          rows={1}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />

        <div className="detail-fields">
          <label className="detail-field">
            <span>Status</span>
            <select value={task.status} onChange={(e) => save({ status: e.target.value })}>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label className="detail-field">
            <span>Priority</span>
            <select value={task.priority} onChange={(e) => save({ priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="detail-field">
            <span>Due date</span>
            <input
              type="date"
              value={toDateInputValue(task.due_at)}
              onChange={(e) => save({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </label>

          <label className="detail-field">
            <span>Repeats</span>
            <select value={task.recurrence || ""} onChange={(e) => save({ recurrence: e.target.value || null })}>
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>

        <label className="detail-field detail-description-field">
          <span>Description</span>
          <textarea
            className="detail-description"
            placeholder="Add more detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={6}
          />
        </label>

        <div className="detail-footer">
          <span className="detail-created">Created {new Date(task.created_at).toLocaleDateString()}</span>
          <button
            className={`danger-button${confirmingDelete ? " confirming" : ""}`}
            onClick={handleDelete}
            disabled={deleting}
          >
            <IconTrash className="icon-xs" />
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
