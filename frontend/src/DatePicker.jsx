import { useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconCalendar, IconX } from "./Icons";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toKey(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseKey(key) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* The native date input hands the whole popup to the browser, so it can't be
   themed and looks nothing like the rest of the app. This mirrors the month
   grid from the Calendar view instead, at a smaller scale. */
export default function DatePicker({ value, onChange, ariaLabel = "Due date" }) {
  const [open, setOpen] = useState(false);
  const selected = parseKey(value);
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const base = parseKey(value) ?? new Date();
    setCursor({ year: base.getFullYear(), month: base.getMonth() });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const todayKey = toKey(new Date());
  const first = new Date(cursor.year, cursor.month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  function shiftMonth(delta) {
    const moved = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: moved.getFullYear(), month: moved.getMonth() });
  }

  const label = selected
    ? selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "No due date";

  return (
    <div className="ui-datepicker" ref={wrapRef}>
      <button
        type="button"
        className={`ui-select-trigger${open ? " is-open" : ""}${selected ? "" : " is-empty"}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="ui-select-value">
          <IconCalendar className="icon-xs ui-date-icon" />
          {label}
        </span>
        {selected && (
          <span
            className="ui-date-clear"
            role="button"
            tabIndex={0}
            title="Clear due date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onChange("");
            }}
          >
            <IconX className="icon-xs" />
          </span>
        )}
      </button>

      {open && (
        <div className="ui-date-pop" role="dialog" aria-label="Choose a date">
          <div className="ui-date-head">
            <button type="button" className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <IconChevronLeft className="icon-xs" />
            </button>
            <span className="ui-date-month">
              {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button type="button" className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
              <IconChevronRight className="icon-xs" />
            </button>
          </div>

          <div className="ui-date-weekdays">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="ui-date-grid">
            {days.map((day) => {
              const key = toKey(day);
              const classes = [
                "ui-date-day",
                day.getMonth() === cursor.month ? "" : "out",
                key === todayKey ? "today" : "",
                key === value ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={key}
                  type="button"
                  className={classes}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="ui-date-actions">
            <button type="button" className="ui-date-action" onClick={() => { onChange(todayKey); setOpen(false); }}>
              Today
            </button>
            <button type="button" className="ui-date-action" onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
