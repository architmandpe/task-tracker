import { useEffect, useMemo, useState } from "react";
import { searchTasks } from "./api";
import { IconSearch, IconPlus, IconList, IconCircleDot, IconCheckCircle, IconClock, IconSparkle } from "./Icons";

const STATIC_ACTIONS = [
  { key: "view-all", label: "Go to All Tasks", icon: IconList, view: "all" },
  { key: "view-active", label: "Go to Active", icon: IconCircleDot, view: "active" },
  { key: "view-done", label: "Go to Done", icon: IconCheckCircle, view: "done" },
  { key: "view-activity", label: "Go to Activity", icon: IconClock, view: "activity" },
];

export default function CommandPalette({ tasks, onClose, onOpenTask, onNewTask, onChangeView }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [aiResults, setAiResults] = useState(null); // null = not searched; [] = searched, no hits
  const [aiLoading, setAiLoading] = useState(false);

  const items = useMemo(() => {
    if (aiResults !== null) {
      return aiResults.map((r) => ({ type: "ai-result", key: `ai-${r.task_id}`, result: r }));
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        { type: "action", key: "new", label: "New task", icon: IconPlus, run: () => onNewTask("") },
        ...STATIC_ACTIONS.map((a) => ({ type: "action", key: a.key, label: a.label, icon: a.icon, run: () => onChangeView(a.view) })),
      ];
    }
    const matches = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({ type: "task", key: `task-${t.id}`, task: t }));
    const aiAction = {
      type: "action",
      key: "ai-search",
      label: `Search all tasks for "${query.trim()}"`,
      icon: IconSparkle,
      run: runAiSearch,
      keepOpen: true,
    };
    const createAction = {
      type: "action",
      key: "create",
      label: `Create task "${query.trim()}"`,
      icon: IconPlus,
      run: () => onNewTask(query.trim()),
    };
    return [...matches, aiAction, createAction];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tasks, onNewTask, onChangeView, aiResults]);

  useEffect(() => setSelected(0), [query, aiResults]);

  async function runAiSearch() {
    setAiLoading(true);
    const resp = await searchTasks(query.trim());
    setAiLoading(false);
    setAiResults(resp.ok ? await resp.json() : []);
  }

  function handleQueryChange(value) {
    setQuery(value);
    if (aiResults !== null) setAiResults(null);
  }

  function activate(item) {
    if (!item) return;
    if (item.type === "task" || item.type === "ai-result") {
      onOpenTask(item.type === "task" ? item.task.id : item.result.task_id);
      onClose();
    } else {
      item.run();
      if (!item.keepOpen) onClose();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(items[selected]);
    } else if (e.key === "Backspace" && query === "" && aiResults !== null) {
      setAiResults(null);
    }
  }

  return (
    <div className="modal-overlay palette-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette-card">
        <div className="palette-input-row">
          <IconSearch className="icon" />
          <input
            autoFocus
            placeholder="Search tasks or run a command…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="palette-results">
          {aiLoading && <div className="palette-empty">Searching…</div>}
          {!aiLoading && items.length === 0 && <div className="palette-empty">No matches</div>}
          {!aiLoading &&
            items.map((item, i) => (
              <button
                key={item.key}
                className={`palette-item${i === selected ? " selected" : ""}`}
                onMouseEnter={() => setSelected(i)}
                onClick={() => activate(item)}
              >
                {item.type === "task" && (
                  <>
                    <span className={`status-dot status-${item.task.status}`} />
                    <span className="palette-item-label">{item.task.title}</span>
                  </>
                )}
                {item.type === "ai-result" && (
                  <>
                    <IconSparkle className="icon-xs palette-ai-icon" />
                    <span className="palette-item-label">{item.result.snippet}</span>
                  </>
                )}
                {item.type === "action" && (
                  <>
                    <item.icon className="icon" />
                    <span className="palette-item-label">{item.label}</span>
                  </>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
