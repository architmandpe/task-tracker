import { useEffect, useState } from "react";
import { listTasks, getAuditLog } from "./api";
import Login from "./Login";
import TaskList from "./TaskList";
import Chat from "./Chat";
import Activity from "./Activity";
import "./App.css";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null = still checking
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadTasks(isInitialCheck = false) {
    setLoadError("");
    let resp;
    try {
      resp = await listTasks();
    } catch {
      setLoadError("Can't reach the server. Check your connection and try again.");
      return;
    }
    if (resp.status === 401) {
      setLoggedIn(false);
      if (!isInitialCheck) setError("Session expired, log in again");
      return;
    }
    if (!resp.ok) {
      setLoadError("Couldn't load your tasks. Try refreshing the page.");
      return;
    }
    setTasks(await resp.json());
    setLoggedIn(true);
  }

  async function loadActivity() {
    const resp = await getAuditLog();
    if (resp.ok) setActivity(await resp.json());
  }

  async function refreshAfterAction() {
    await Promise.all([loadTasks(), loadActivity()]);
  }

  useEffect(() => {
    loadTasks(true);
    loadActivity();
  }, []);

  if (loggedIn === null) {
    return (
      <div id="app">
        <p id="loading">Loading…</p>
      </div>
    );
  }

  return (
    <div id="app">
      <h1>Task Tracker</h1>
      {loggedIn ? (
        <>
          <div id="panels">
            <TaskList tasks={tasks} error={loadError} />
            <Chat onAction={refreshAfterAction} />
          </div>
          <Activity entries={activity} />
        </>
      ) : (
        <>
          {error && <div id="error">{error}</div>}
          <Login onLoggedIn={refreshAfterAction} />
        </>
      )}
    </div>
  );
}
