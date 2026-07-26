import { useEffect, useState } from "react";
import { listTasks } from "./api";
import Login from "./Login";
import TaskList from "./TaskList";
import Chat from "./Chat";
import "./App.css";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null = still checking
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadTasks() {
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
      setError("Session expired, log in again");
      return;
    }
    if (!resp.ok) {
      setLoadError("Couldn't load your tasks. Try refreshing the page.");
      return;
    }
    setTasks(await resp.json());
    setLoggedIn(true);
  }

  useEffect(() => {
    loadTasks();
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
        <div id="panels">
          <TaskList tasks={tasks} error={loadError} />
          <Chat onAction={loadTasks} />
        </div>
      ) : (
        <>
          {error && <div id="error">{error}</div>}
          <Login onLoggedIn={loadTasks} />
        </>
      )}
    </div>
  );
}
