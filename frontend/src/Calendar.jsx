import { useEffect, useMemo, useState } from "react";
import { PRIORITY_RANK } from "./taskUtils";
import { IconChevronLeft, IconChevronRight } from "./Icons";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;
const ROWS = 6; // Fixed height so the grid doesn't jump between 5- and 6-week months.

function dateKey(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Reads due_at in local time, the same way formatDue does in the list view, so
// both views always agree on which day a task belongs to.
function dueKey(dueAt) {
  return dueAt ? dateKey(new Date(dueAt)) : null;
}

function byPriorityThenTitle(a, b) {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.title.localeCompare(b.title);
}

function Chip({ task, overdue, onOpen }) {
  const done = task.status === "done";
  return (
    <button
      type="button"
      className={`cal-chip cal-chip-${task.priority}${done ? " done" : ""}${overdue ? " overdue" : ""}`}
      title={task.title}
      onClick={(e) => {
        e.stopPropagation(); // the cell itself starts a new task
        onOpen(task.id);
      }}
    >
      <span className="cal-chip-text">{task.title}</span>
    </button>
  );
}

export default function Calendar({ tasks, onOpenTask, onNewTaskOnDate, navEnabled = true }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [expandedKey, setExpandedKey] = useState(null);
  const [direction, setDirection] = useState(0);

  const todayKey = dateKey(new Date());

  const { scheduled, unscheduled } = useMemo(() => {
    const byDay = new Map();
    const none = [];
    for (const task of tasks) {
      const key = dueKey(task.due_at);
      if (!key) {
        none.push(task);
        continue;
      }
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(task);
    }
    for (const list of byDay.values()) list.sort(byPriorityThenTitle);
    none.sort(byPriorityThenTitle);
    return { scheduled: byDay, unscheduled: none };
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: ROWS * 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [cursor]);

  // Scales the load bars: the busiest day in view fills the width.
  const busiest = useMemo(
    () => Math.max(1, ...cells.map((d) => scheduled.get(dateKey(d))?.length ?? 0)),
    [cells, scheduled]
  );

  function goToMonth(delta) {
    setDirection(delta);
    setExpandedKey(null);
    setCursor(({ year, month }) => {
      const moved = new Date(year, month + delta, 1);
      return { year: moved.getFullYear(), month: moved.getMonth() };
    });
  }

  function goToToday() {
    const now = new Date();
    setDirection(now < new Date(cursor.year, cursor.month, 1) ? -1 : 1);
    setExpandedKey(null);
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  useEffect(() => {
    if (!navEnabled) return;
    function onKeyDown(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") goToMonth(-1);
      else if (e.key === "ArrowRight") goToMonth(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navEnabled]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const showingToday = todayKey.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`);

  return (
    <div id="calendar-section">
      <div className="cal-main">
        <div className="cal-toolbar">
          <h2 className="cal-month">{monthLabel}</h2>
          <div className="cal-nav">
            <button type="button" className="icon-button" onClick={() => goToMonth(-1)} title="Previous month (←)">
              <IconChevronLeft className="icon" />
            </button>
            <button type="button" className="cal-today-btn" onClick={goToToday} disabled={showingToday}>
              Today
            </button>
            <button type="button" className="icon-button" onClick={() => goToMonth(1)} title="Next month (→)">
              <IconChevronRight className="icon" />
            </button>
          </div>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="cal-grid" key={`${cursor.year}-${cursor.month}`} data-direction={direction}>
          {cells.map((day) => {
            const key = dateKey(day);
            const dayTasks = scheduled.get(key) ?? [];
            const inMonth = day.getMonth() === cursor.month;
            const isToday = key === todayKey;
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const expanded = expandedKey === key;
            const visible = expanded ? dayTasks : dayTasks.slice(0, MAX_CHIPS);
            const hidden = dayTasks.length - visible.length;

            return (
              <div
                key={key}
                className={`cal-cell${inMonth ? "" : " out-of-month"}${isToday ? " is-today" : ""}${weekend ? " weekend" : ""}`}
                onClick={() => onNewTaskOnDate(key)}
                title="Click to add a task on this day"
              >
                <div className="cal-cell-head">
                  <span className="cal-date">{day.getDate()}</span>
                </div>
                <div className="cal-load" aria-hidden="true">
                  {dayTasks.length > 0 && <span style={{ width: `${(dayTasks.length / busiest) * 100}%` }} />}
                </div>
                <div className="cal-chips">
                  {visible.map((task) => (
                    <Chip
                      key={task.id}
                      task={task}
                      overdue={task.status !== "done" && key < todayKey}
                      onOpen={onOpenTask}
                    />
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      className="cal-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedKey(key);
                      }}
                    >
                      +{hidden} more
                    </button>
                  )}
                  {expanded && dayTasks.length > MAX_CHIPS && (
                    <button
                      type="button"
                      className="cal-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedKey(null);
                      }}
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="cal-rail">
        <div className="cal-rail-head">
          Unscheduled <span className="nav-count">{unscheduled.length}</span>
        </div>
        {unscheduled.length === 0 ? (
          <p className="cal-rail-empty">Everything here has a date.</p>
        ) : (
          <div className="cal-rail-list">
            {unscheduled.map((task) => (
              <Chip key={task.id} task={task} overdue={false} onOpen={onOpenTask} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
