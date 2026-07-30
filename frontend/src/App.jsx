import { useCallback, useEffect, useRef, useState } from "react";
import { listTasks, getAuditLog, getMe, logout as logoutRequest, updateTask, deleteTask, restoreTask } from "./api";
import Login from "./Login";
import Landing from "./Landing";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import TaskList from "./TaskList";
import TaskDetailPanel from "./TaskDetailPanel";
import NewTaskModal from "./NewTaskModal";
import CommandPalette from "./CommandPalette";
import Chat from "./Chat";
import Activity from "./Activity";
import Toasts from "./Toasts";
import { filterTasks } from "./taskUtils";
import { IconSparkle, IconX, IconResize } from "./Icons";
import "./App.css";

let toastId = 0;
const MIN_CHAT_W = 300;
const MAX_CHAT_W = 640;
const DEFAULT_CHAT_W = 380;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null = still checking
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [view, setView] = useState("tasks"); // "tasks" | "activity"
  const [filter, setFilter] = useState("all"); // "all" | "active" | "done"
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newTaskDraft, setNewTaskDraft] = useState(null); // string | null - modal open when non-null
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [authView, setAuthView] = useState("landing"); // "landing" | "login" | "signup"
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(localStorage.getItem("chatWidth"));
    return saved >= MIN_CHAT_W && saved <= MAX_CHAT_W ? saved : DEFAULT_CHAT_W;
  });
  const chatWidthRef = useRef(chatWidth);

  // Light by default so the app opens in the same key as the landing page; the
  // system preference is deliberately ignored in favour of an explicit choice.
  const [theme, setTheme] = useState(() => (localStorage.getItem("theme") === "dark" ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const startChatResize = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidthRef.current;
    document.body.classList.add("resizing-chat");

    function onMove(ev) {
      const next = Math.min(MAX_CHAT_W, Math.max(MIN_CHAT_W, startWidth + (startX - ev.clientX)));
      chatWidthRef.current = next;
      setChatWidth(next);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("resizing-chat");
      localStorage.setItem("chatWidth", String(chatWidthRef.current));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const addToast = useCallback((text, tone = "info", action = null) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // The boot spinner renders while loggedIn is null, so the initial check has to
  // land on true or false in every branch. A failing /tasks must never leave the
  // session undecided, or the app hangs on the spinner forever.
  async function resolveSessionAfterFailure() {
    try {
      const resp = await getMe();
      setLoggedIn(resp.ok);
    } catch {
      setLoggedIn(false);
    }
  }

  async function loadTasks(isInitialCheck = false) {
    setLoadError("");
    let resp;
    try {
      resp = await listTasks();
    } catch {
      setLoadError("Can't reach the server. Check your connection and try again.");
      if (isInitialCheck) await resolveSessionAfterFailure();
      return;
    }
    if (resp.status === 401) {
      setLoggedIn(false);
      if (!isInitialCheck) addToast("Session expired, log in again", "danger");
      return;
    }
    if (!resp.ok) {
      setLoadError("Couldn't load your tasks. Try refreshing the page.");
      if (isInitialCheck) await resolveSessionAfterFailure();
      return;
    }
    setTasks(await resp.json());
    setLoggedIn(true);
  }

  async function loadActivity() {
    const resp = await getAuditLog();
    if (resp.ok) setActivity(await resp.json());
  }

  async function loadUser() {
    const resp = await getMe();
    if (resp.ok) setUser(await resp.json());
  }

  async function refreshAfterAction() {
    await Promise.all([loadTasks(), loadActivity()]);
  }

  async function handleLoggedIn() {
    await Promise.all([refreshAfterAction(), loadUser()]);
  }

  async function handleLogout() {
    await logoutRequest();
    setLoggedIn(false);
    setAuthView("landing");
    setUser(null);
    setTasks([]);
    setActivity([]);
  }

  useEffect(() => {
    loadTasks(true).then(() => loadUser());
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+K for the palette, N for a new task, Esc to back out of overlays.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (newTaskDraft !== null) setNewTaskDraft(null);
        else if (selectedTaskId !== null) setSelectedTaskId(null);
        return;
      }
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (!typing && loggedIn && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNewTaskDraft("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, newTaskDraft, selectedTaskId, loggedIn]);

  function openTask(id) {
    setPaletteOpen(false);
    setSelectedTaskId(id);
  }

  function handleTaskCreated(task) {
    setTasks((t) => [task, ...t]);
    setNewTaskDraft(null);
    addToast(`Created "${task.title}"`, "success");
  }

  function handleTaskUpdated(task) {
    setTasks((t) => t.map((x) => (x.id === task.id ? task : x)));
    loadTasks(); // reconcile silently (e.g. a recurring task rolling over creates a sibling)
  }

  async function undoDelete(id) {
    const resp = await restoreTask(id);
    if (!resp.ok) {
      addToast("Couldn't restore that task. Try again.", "danger");
      loadTasks();
      return;
    }
    const task = await resp.json();
    setTasks((t) => (t.some((x) => x.id === task.id) ? t : [...t, task]));
    loadTasks(); // reconcile ordering and grouping
  }

  function handleTaskDeleted(id) {
    const removed = tasks.find((x) => x.id === id);
    setTasks((t) => t.filter((x) => x.id !== id));
    setSelectedTaskId((cur) => (cur === id ? null : cur));
    addToast(removed ? `Deleted "${removed.title}"` : "Task deleted", "info", {
      label: "Undo",
      onClick: () => undoDelete(id),
    });
  }

  async function handleDeleteTask(task) {
    // Optimistic: the row goes straight away, and the toast carries the undo.
    setTasks((t) => t.filter((x) => x.id !== task.id));
    setSelectedTaskId((cur) => (cur === task.id ? null : cur));

    const resp = await deleteTask(task.id);
    if (!resp.ok) {
      addToast("Couldn't delete that task. Try again.", "danger");
      loadTasks(); // put the row back from the server's copy
      return;
    }
    addToast(`Deleted "${task.title}"`, "info", {
      label: "Undo",
      onClick: () => undoDelete(task.id),
    });
  }

  async function toggleDone(task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status: nextStatus } : x)));
    const resp = await updateTask(task.id, { status: nextStatus });
    if (!resp.ok) {
      setTasks((t) => t.map((x) => (x.id === task.id ? task : x)));
      addToast("Couldn't update that task. Try again.", "danger");
      return;
    }
    loadTasks();
  }

  function handlePaletteNewTask(title) {
    setPaletteOpen(false);
    setNewTaskDraft(title);
  }

  function handlePaletteChangeView(target) {
    setPaletteOpen(false);
    if (target === "activity") setView("activity");
    else {
      setView("tasks");
      setFilter(target);
    }
  }

  function selectTasksView(nextFilter) {
    setView("tasks");
    setFilter(nextFilter);
  }

  if (loggedIn === null) {
    return (
      <div id="boot-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!loggedIn) {
    if (authView === "landing") {
      return (
        <Landing
          onLogin={() => setAuthView("login")}
          onSignup={() => setAuthView("signup")}
        />
      );
    }
    return (
      <Login
        initialMode={authView}
        onLoggedIn={handleLoggedIn}
        onBack={() => setAuthView("landing")}
      />
    );
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const visibleCount = filterTasks(tasks, filter).length;
  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => t.status !== "done").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div id="workspace" style={{ "--chat-w": `${chatWidth}px` }}>
      <Sidebar
        user={user}
        view={view}
        filter={filter}
        counts={counts}
        onSelectTasks={selectTasksView}
        onSelectActivity={() => setView("activity")}
        onNewTask={() => setNewTaskDraft("")}
        onOpenPalette={() => setPaletteOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <div id="main-column">
        <Topbar view={view} filter={filter} count={visibleCount} />
        <main id="main-content">
          {view === "tasks" ? (
            <TaskList
              tasks={tasks}
              filter={filter}
              error={loadError}
              onOpenTask={openTask}
              onToggleDone={toggleDone}
              onDeleteTask={handleDeleteTask}
            />
          ) : (
            <Activity entries={activity} />
          )}
        </main>
      </div>

      <div
        id="chat-resize-handle"
        onMouseDown={startChatResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize assistant panel"
      >
        <div className="chat-resize-grip">
          <IconResize className="icon-xs" />
        </div>
      </div>

      <Chat onAction={refreshAfterAction} mobileOpen={mobileChatOpen} />

      <button
        id="chat-fab"
        onClick={() => setMobileChatOpen((v) => !v)}
        aria-label={mobileChatOpen ? "Close assistant" : "Open assistant"}
      >
        {mobileChatOpen ? <IconX className="icon" /> : <IconSparkle className="icon" />}
      </button>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
          onError={(msg) => addToast(msg, "danger")}
        />
      )}

      {newTaskDraft !== null && (
        <NewTaskModal
          initialTitle={newTaskDraft}
          onClose={() => setNewTaskDraft(null)}
          onCreated={handleTaskCreated}
          onError={(msg) => addToast(msg, "danger")}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          tasks={tasks}
          onClose={() => setPaletteOpen(false)}
          onOpenTask={openTask}
          onNewTask={handlePaletteNewTask}
          onChangeView={handlePaletteChangeView}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
