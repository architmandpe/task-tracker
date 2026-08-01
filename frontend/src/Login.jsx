import { useEffect, useState } from "react";
import { login, signup, getAuthProviders } from "./api";
import { IconGoogle } from "./Icons";

// The callback bounces back to "/?google=<reason>" when the handshake doesn't
// complete, so the reason has to be read off the URL rather than a response.
const GOOGLE_ERRORS = {
  cancelled: "Google sign-in was cancelled",
  failed: "Google sign-in didn't complete. Try again, or use your email and password.",
  exists: "You already have an account with that email — log in instead.",
  nouser: "No Cadence account uses that Google account yet — sign up first.",
};

// Land on whichever form actually fixes the problem.
const MODE_FOR_ERROR = { exists: "login", nouser: "signup" };

export default function Login({ onLoggedIn, onBack, initialMode = "login" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const googleResult = new URLSearchParams(window.location.search).get("google");
  const [mode, setMode] = useState(MODE_FOR_ERROR[googleResult] || initialMode); // "login" | "signup"
  const [error, setError] = useState(() => GOOGLE_ERRORS[googleResult] || "");
  const [submitting, setSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Only offer the button if the server has credentials for it.
  useEffect(() => {
    let cancelled = false;
    getAuthProviders()
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => !cancelled && setGoogleEnabled(Boolean(data?.google)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't leave ?google=... in the address bar to reappear on refresh.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("google")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
      <img className="login-photo" src="/hero-bg.jpg" alt="" aria-hidden="true" />
      <div className="login-tint" aria-hidden="true" />
      {onBack && (
        <button type="button" className="login-back" onClick={onBack}>← Back</button>
      )}
      <div className="login-card">
        <h2 className="login-title">Cadence</h2>
        <p className="login-subtitle">
          {mode === "login" ? "Welcome back — log in to continue" : "Create your account to get started"}
        </p>

        {error && <div className="login-error">{error}</div>}

        {googleEnabled && (
          <>
            {/* A plain link, not fetch: the OAuth handshake is a top-level
                navigation to Google and back. */}
            {/* The mode goes along for the ride so the callback can refuse a
                sign-up into an existing account, and a log-in to one that isn't
                there yet - same contract the email/password forms keep. */}
            <a className="login-google" href={`/auth/google/start?mode=${mode}`}>
              <IconGoogle className="login-google-mark" />
              {mode === "login" ? "Log in with Google" : "Sign up with Google"}
            </a>
            <div className="login-divider"><span>or</span></div>
          </>
        )}

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
