import { useEffect, useState } from "react";
import {
  IconCadence,
  IconPlus,
  IconSearch,
  IconList,
  IconCircleDot,
  IconCheckCircle,
  IconClock,
  IconSparkle,
  IconSend,
} from "./Icons";

/* A scripted replica of the app, used only on the landing page. It mirrors real
   behaviour — a sentence goes in, a structured task comes out — but runs off a
   fixed timeline instead of the API. Keep the copy honest: nothing here should
   claim something the assistant can't actually do. */

const PROMPT = "email the design feedback by thursday, high priority";

const REPLY_PARTS = [
  ["Added ", false],
  ["Email the design feedback", true],
  [" — due Thu, 6 Aug · High", false],
];
const REPLY_LENGTH = REPLY_PARTS.reduce((n, [text]) => n + text.length, 0);

const GROUPS = [
  {
    status: "In Progress",
    tasks: [
      { title: "Write feature copy for the marketing page", priority: "High" },
      { title: "Add Fraunces + Inter web fonts", due: "Aug 4" },
    ],
  },
  {
    status: "Todo",
    tasks: [
      { title: "Ship the landing page to production", priority: "High", due: "Aug 3" },
      { title: "QA the signup flow end to end" },
      { title: "Review colour contrast on the hero", priority: "Low" },
    ],
  },
  {
    status: "Done",
    tasks: [{ title: "Design the landing page hero section", priority: "High", done: true }],
  },
];

const NEW_TASK = { title: "Email the design feedback", priority: "High", due: "Aug 6" };

const SUGGESTIONS = ["What's overdue?", "Show my high priority tasks", "What did I complete today?"];

function Task({ task, isNew }) {
  return (
    <div className={`hd-task${task.done ? " hd-done" : ""}${isNew ? " hd-task-new" : ""}`}>
      <span className={`hd-check${task.done ? " hd-check-done" : ""}`}>
        {task.done && <IconCheckCircle className="icon-xs" />}
      </span>
      <span className="hd-task-title">{task.title}</span>
      <span className="hd-task-meta">
        {task.priority === "High" && <span className="hd-badge hd-badge-high">High</span>}
        {task.priority === "Low" && <span className="hd-badge hd-badge-low">Low</span>}
        {task.due && <span className="hd-badge hd-badge-due">{task.due}</span>}
      </span>
    </div>
  );
}

export default function HeroDemo() {
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) {
      setSent(true);
      setRevealed(REPLY_LENGTH);
      setAdded(true);
      return;
    }

    let cancelled = false;
    let timer = null;
    const sleep = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    async function run() {
      while (!cancelled) {
        setTyped("");
        setSent(false);
        setThinking(false);
        setRevealed(0);
        setAdded(false);
        await sleep(1600);

        for (let i = 1; i <= PROMPT.length && !cancelled; i++) {
          setTyped(PROMPT.slice(0, i));
          await sleep(36);
        }
        if (cancelled) return;

        await sleep(500);
        setTyped("");
        setSent(true);
        setThinking(true);
        await sleep(1100);
        if (cancelled) return;

        setThinking(false);
        for (let i = 1; i <= REPLY_LENGTH && !cancelled; i += 2) {
          setRevealed(i);
          await sleep(22);
        }
        if (cancelled) return;
        setRevealed(REPLY_LENGTH);

        await sleep(300);
        setAdded(true);
        await sleep(6000);
      }
    }

    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const total = added ? 7 : 6;

  let cursor = 0;
  const reply = REPLY_PARTS.map(([text, bold], i) => {
    const start = cursor;
    cursor += text.length;
    const slice = text.slice(0, Math.max(0, Math.min(text.length, revealed - start)));
    if (!slice) return null;
    return bold ? <strong key={i}>{slice}</strong> : <span key={i}>{slice}</span>;
  });

  return (
    <div className="hd" aria-hidden="true">
      <aside className="hd-sidebar">
        <div className="hd-brand">
          <span className="hd-brand-mark"><IconCadence className="icon-xs" /></span>
          Cadence
        </div>
        <div className="hd-new-btn"><IconPlus className="icon-xs" /> New task</div>
        <div className="hd-search"><IconSearch className="icon-xs" /> Search</div>
        <div className="hd-nav-label">Tasks</div>
        <div className="hd-nav-item hd-nav-active">
          <IconList className="icon-xs" /> All Tasks <span className="hd-count">{total}</span>
        </div>
        <div className="hd-nav-item">
          <IconCircleDot className="icon-xs" /> Active <span className="hd-count">{added ? 6 : 5}</span>
        </div>
        <div className="hd-nav-item">
          <IconCheckCircle className="icon-xs" /> Done <span className="hd-count">1</span>
        </div>
        <div className="hd-nav-label">Insights</div>
        <div className="hd-nav-item"><IconClock className="icon-xs" /> Activity</div>
      </aside>

      <main className="hd-main">
        <div className="hd-main-head">
          <h3>All Tasks</h3>
          <p>{total} tasks</p>
        </div>
        {GROUPS.map((group) => (
          <div key={group.status} className="hd-group">
            <div className="hd-group-label">
              {group.status}
              <span>{group.tasks.length + (added && group.status === "Todo" ? 1 : 0)}</span>
            </div>
            {group.status === "Todo" && added && <Task task={NEW_TASK} isNew />}
            {group.tasks.map((task) => (
              <Task key={task.title} task={task} />
            ))}
          </div>
        ))}
      </main>

      <section className="hd-chat">
        <div className="hd-chat-head">
          <span className="hd-chat-icon"><IconSparkle className="icon-xs" /></span>
          <div>
            <div className="hd-chat-title">Assistant</div>
            <div className="hd-chat-sub">Create, update, or ask about your tasks</div>
          </div>
        </div>

        <div className="hd-messages">
          {!sent ? (
            <div className="hd-empty">
              <p>How can I help?</p>
              {SUGGESTIONS.map((s) => (
                <div key={s} className="hd-suggestion">{s}</div>
              ))}
            </div>
          ) : (
            <>
              <div className="hd-msg hd-msg-user">{PROMPT}</div>
              {thinking ? (
                <div className="hd-msg hd-msg-assistant hd-thinking">
                  <i /><i /><i />
                </div>
              ) : (
                <div className="hd-msg hd-msg-assistant">{reply}</div>
              )}
            </>
          )}
        </div>

        <div className="hd-input">
          <div className="hd-input-box">
            {typed ? (
              <>
                {typed}
                <span className="hd-caret" />
              </>
            ) : (
              <span className="hd-placeholder">Ask or tell the assistant...</span>
            )}
          </div>
          <span className="hd-send"><IconSend className="icon-xs" /></span>
        </div>
      </section>
    </div>
  );
}
