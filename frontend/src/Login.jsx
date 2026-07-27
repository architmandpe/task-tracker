import { useState } from "react";
import { login, signup } from "./api";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      const resp = await signup(email, password);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.detail || "Signup failed");
        return;
      }
    }

    const resp = await login(email, password);
    if (!resp.ok) {
      setError("Login failed");
      return;
    }
    onLoggedIn();
  }

  return (
    <div id="login-section">
      <div className="login-card">
        <h2 className="login-title">Task Tracker</h2>
        <p className="login-subtitle">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
        </form>
        <p className="toggle-mode">
          {mode === "login" ? (
            <>No account? <button type="button" onClick={() => setMode("signup")}>Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => setMode("login")}>Log in</button></>
          )}
        </p>
        {error && <div id="error">{error}</div>}
      </div>
    </div>
  );
}
