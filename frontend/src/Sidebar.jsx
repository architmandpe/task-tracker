import { IconList, IconCircleDot, IconCheckCircle, IconClock, IconPlus, IconSearch, IconLogOut, IconCommand, IconCadence, IconSun, IconMoon } from "./Icons";

const NAV_ITEMS = [
  { key: "all", label: "All Tasks", icon: IconList },
  { key: "active", label: "Active", icon: IconCircleDot },
  { key: "done", label: "Done", icon: IconCheckCircle },
];

export default function Sidebar({ user, view, filter, counts, onSelectTasks, onSelectActivity, onNewTask, onOpenPalette, onLogout, theme, onToggleTheme }) {
  const dark = theme === "dark";

  return (
    <aside id="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark"><IconCadence className="icon-xs" /></span>
        <span className="brand-name">Cadence</span>
      </div>

      <button className="sidebar-action" onClick={onNewTask}>
        <IconPlus className="icon" />
        <span className="action-label">New task</span>
      </button>

      <button className="sidebar-action secondary-action" onClick={onOpenPalette}>
        <IconSearch className="icon" />
        <span className="action-label">Search</span>
        <span className="kbd-hint"><IconCommand className="icon-xs" />K</span>
      </button>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Tasks</div>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`sidebar-nav-item${view === "tasks" && filter === key ? " active" : ""}`}
            onClick={() => onSelectTasks(key)}
          >
            <Icon className="icon" />
            <span>{label}</span>
            <span className="nav-count">{counts[key]}</span>
          </button>
        ))}

        <div className="sidebar-section-label">Insights</div>
        <button
          className={`sidebar-nav-item${view === "activity" ? " active" : ""}`}
          onClick={onSelectActivity}
        >
          <IconClock className="icon" />
          <span>Activity</span>
        </button>
      </nav>

      <button
        type="button"
        className={`theme-toggle${dark ? " is-dark" : ""}`}
        onClick={onToggleTheme}
        role="switch"
        aria-checked={dark}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="theme-toggle-track" aria-hidden="true">
          <IconSun className="icon-xs theme-icon-sun" />
          <IconMoon className="icon-xs theme-icon-moon" />
          <span className="theme-toggle-knob" />
        </span>
        <span className="theme-toggle-label">{dark ? "Dark" : "Light"}</span>
      </button>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="user-avatar">{(user?.email || "?")[0].toUpperCase()}</span>
          <span className="user-email">{user?.email || "…"}</span>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Log out">
          <IconLogOut className="icon" />
        </button>
      </div>
    </aside>
  );
}
