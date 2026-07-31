import { useEffect, useRef, useState } from "react";
import { updateTask, deleteTask } from "./api";
import { toDateInputValue } from "./taskUtils";
import { IconX, IconTrash } from "./Icons";
import Select from "./Select";
import DatePicker from "./DatePicker";

const STATUS_OPTIONS = [
  { value: "todo", label: "Todo", dot: "var(--text-muted)" },
  { value: "in_progress", label: "In Progress", dot: "var(--warning)" },
  { value: "done", label: "Done", dot: "var(--success)" },
];

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

export default function TaskDetailPanel({ task, onClose, onUpdated, onDeleted, onError }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const panelRef = useRef(null);
  const descriptionRef = useRef(description);

  const savedDescription = task.description || "";
  const descriptionDirty = description.trim() !== savedDescription;

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setConfirmingDelete(false);
    setJustSaved(false);
    panelRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Keeps the latest draft available to the unmount handler below without
  // re-running it on every keystroke.
  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  // Closing the panel with an unsaved description would silently bin it, so it
  // gets flushed on the way out. The Save button is for confidence, not the only
  // way to keep your words.
  useEffect(() => {
    return () => {
      const draft = descriptionRef.current.trim();
      if (draft !== (task.description || "")) {
        updateTask(task.id, { description: draft || null });
      }
    };
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

  async function saveDescription() {
    if (!descriptionDirty) return;
    await save({ description: description.trim() || null });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
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
          <div className="detail-field">
            <span>Status</span>
            <Select
              ariaLabel="Status"
              value={task.status}
              options={STATUS_OPTIONS}
              onChange={(v) => save({ status: v })}
            />
          </div>

          <div className="detail-field">
            <span>Priority</span>
            <Select
              ariaLabel="Priority"
              value={task.priority}
              options={PRIORITY_OPTIONS}
              onChange={(v) => save({ priority: v })}
            />
          </div>

          <div className="detail-field">
            <span>Due date</span>
            <DatePicker
              value={toDateInputValue(task.due_at)}
              onChange={(v) => save({ due_at: v ? new Date(v).toISOString() : null })}
            />
          </div>

          <div className="detail-field">
            <span>Repeats</span>
            <Select
              ariaLabel="Repeats"
              value={task.recurrence || ""}
              options={RECURRENCE_OPTIONS}
              onChange={(v) => save({ recurrence: v || null })}
            />
          </div>
        </div>

        <div className="detail-field detail-description-field">
          <span>Description</span>
          <textarea
            className="detail-description"
            placeholder="Add more detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveDescription();
            }}
            rows={6}
          />
          <div className="detail-description-actions">
            {descriptionDirty ? (
              <span className="detail-save-hint">Unsaved changes</span>
            ) : justSaved ? (
              <span className="detail-save-hint is-saved">Saved</span>
            ) : (
              <span />
            )}
            <div className="detail-save-buttons">
              {descriptionDirty && (
                <button type="button" className="secondary" onClick={() => setDescription(savedDescription)}>
                  Discard
                </button>
              )}
              <button type="button" onClick={saveDescription} disabled={!descriptionDirty}>
                Save
              </button>
            </div>
          </div>
        </div>

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
