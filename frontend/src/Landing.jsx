import { IconCadence } from "./Icons";
import "./Landing.css";

const FEATURES = [
  {
    title: "Talk to your tasks",
    body: "Create, update, or delete tasks by just describing what you need — the assistant handles the rest.",
    wash: "var(--color-mint-wash)",
  },
  {
    title: "Search by meaning",
    body: "Find a task even when you don't remember the exact words you used to write it.",
    wash: "var(--color-peach-wash)",
  },
  {
    title: "Stay accountable",
    body: "Every action the assistant takes on your behalf is logged, so you always know what changed and why.",
    wash: "var(--color-lavender-wash)",
  },
  {
    title: "Never miss a beat",
    body: "Recurring tasks roll over to their next occurrence automatically the moment you complete them.",
    wash: "var(--color-teal-mist)",
  },
];

export default function Landing({ onLogin, onSignup }) {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="landing-mark"><IconCadence className="icon-xs" /></span>
          <span className="landing-wordmark">Cadence</span>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="landing-btn landing-btn-ghost" onClick={onLogin}>Log in</button>
          <button type="button" className="landing-btn landing-btn-dark" onClick={onSignup}>Sign up</button>
        </div>
      </nav>

      <header className="landing-hero">
        <img className="landing-hero-photo" src="/hero-bg.jpg" alt="" aria-hidden="true" />
        <div className="landing-hero-overlay" aria-hidden="true" />
        <div className="landing-hero-content">
          <span className="landing-eyebrow">Your AI task assistant</span>
          <h1 className="landing-headline">
            Keep tasks organised,
            <br />
            no more missing deadlines.
          </h1>
          <div className="landing-cta-row">
            <button type="button" className="landing-btn landing-btn-dark" onClick={onSignup}>Sign up</button>
            <button type="button" className="landing-btn landing-btn-ghost-light" onClick={onLogin}>Log in</button>
          </div>
          <div className="landing-mockup">
            <img src="/hero-screenshot.png" alt="Cadence task list and AI assistant panel" />
          </div>
        </div>
      </header>

      <section className="landing-features">
        <h2 className="landing-section-heading">What it actually does</h2>
        <div className="landing-feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-block" style={{ background: f.wash }}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-wordmark-section">
        <h2 className="landing-big-wordmark">Cadence</h2>
        <p className="landing-tagline">Less managing your list. More moving through it.</p>
        <button type="button" className="landing-btn landing-btn-dark" onClick={onSignup}>Sign up — it's free</button>
      </section>

      <footer className="landing-footer">
        <span>Cadence</span>
      </footer>
    </div>
  );
}
