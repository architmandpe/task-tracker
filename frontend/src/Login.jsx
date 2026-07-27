import { useState } from "react";
import { login, signup } from "./api";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (mode === "signup") {
      const resp = await signup(email, password);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.detail || "Signup failed");
        setSubmitting(false);
        return;
      }
    }

    const resp = await login(email, password);
    if (!resp.ok) {
      setError("Incorrect email or password");
      setSubmitting(false);
      return;
    }
    onLoggedIn();
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  return (
    <div id="login-section">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-card">
        <div className="login-mark">T</div>
        <h2 className="login-title">Task Tracker</h2>
        <p className="login-subtitle">
          {mode === "login" ? "Welcome back — log in to continue" : "Create your account to get started"}
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="field-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="toggle-mode">
          {mode === "login" ? (
            <>No account? <button type="button" onClick={() => switchMode("signup")}>Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => switchMode("login")}>Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
