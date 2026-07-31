import { IconList, IconCalendar } from "./Icons";

const TITLES = {
  all: "All Tasks",
  active: "Active",
  done: "Done",
};

export default function Topbar({ view, filter, count, layout, onLayoutChange }) {
  const title = view === "activity" ? "Activity" : TITLES[filter];

  return (
    <header id="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {view === "tasks" && <span className="topbar-count">{count} {count === 1 ? "task" : "tasks"}</span>}
      </div>

      {/* Same tasks, different lens — so this lives here rather than in the
          sidebar, and the All/Active/Done filter keeps applying to both. */}
      {view === "tasks" && (
        <div className="layout-switch" role="group" aria-label="View">
          <button
            type="button"
            className={layout === "list" ? "is-active" : ""}
            onClick={() => onLayoutChange("list")}
            aria-pressed={layout === "list"}
          >
            <IconList className="icon-xs" /> List
          </button>
          <button
            type="button"
            className={layout === "calendar" ? "is-active" : ""}
            onClick={() => onLayoutChange("calendar")}
            aria-pressed={layout === "calendar"}
          >
            <IconCalendar className="icon-xs" /> Calendar
          </button>
        </div>
      )}
    </header>
  );
}
