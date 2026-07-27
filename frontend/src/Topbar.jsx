const TITLES = {
  all: "All Tasks",
  active: "Active",
  done: "Done",
};

export default function Topbar({ view, filter, count }) {
  const title = view === "activity" ? "Activity" : TITLES[filter];

  return (
    <header id="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {view === "tasks" && <span className="topbar-count">{count} {count === 1 ? "task" : "tasks"}</span>}
      </div>
    </header>
  );
}
