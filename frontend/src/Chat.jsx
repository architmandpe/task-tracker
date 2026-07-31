import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChat } from "./api";
import { IconSparkle, IconSend } from "./Icons";

const SUGGESTIONS = [
  "What's overdue?",
  "Show my high priority tasks",
  "Create a task to follow up tomorrow",
  "What did I complete today?",
];

// How many suggestions stay on offer once the conversation is under way.
const FOLLOWUP_COUNT = 3;

// Mirrors the textarea's max-height in App.css (~4 lines).
const INPUT_MAX_HEIGHT = 98;

// Keeps the suggestions useful instead of re-offering what was just asked: the
// unused ones come first, topped up from the top of the list so the rail never
// empties out.
function pickFollowups(used) {
  const unused = SUGGESTIONS.filter((s) => !used.includes(s));
  const topUp = SUGGESTIONS.filter((s) => used.includes(s));
  return [...unused, ...topUp].slice(0, FOLLOWUP_COUNT);
}

export default function Chat({ onAction, mobileOpen }) {
  const [messages, setMessages] = useState([]); // {role: "user" | "assistant", text, streaming}
  const [input, setInput] = useState("");
  const [usedSuggestions, setUsedSuggestions] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-grow, capped at INPUT_MAX_HEIGHT. Driven off the value so clearing the
  // box after a send snaps it back to one line.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden";
  }, [input, pendingQuestion]);

  function applySuggestion(text) {
    setUsedSuggestions((u) => (u.includes(text) ? u : [...u, text]));
    setInput(text);
    inputRef.current?.focus();
  }

  function appendToStreamingReply(text) {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        const updated = [...m];
        updated[updated.length - 1] = { ...last, text: last.text + text };
        return updated;
      }
      return [...m, { role: "assistant", text, streaming: true }];
    });
  }

  function finalizeStreamingReply() {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (!last?.streaming) return m;
      const updated = [...m];
      updated[updated.length - 1] = { ...last, streaming: false };
      return updated;
    });
  }

  async function send(body) {
    setSending(true);
    let confirmRequired = false;

    await streamChat(body, (event) => {
      if (event.type === "confirm_required") {
        confirmRequired = true;
        setPendingQuestion(event.text);
      }
      appendToStreamingReply(event.text);
    });

    finalizeStreamingReply();
    setSending(false);
    if (!confirmRequired) onAction?.();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text: input }]);
    send({ message: input });
    setInput("");
  }

  // Enter sends; Shift+Enter breaks the line for longer requests. Cmd/Ctrl+Enter
  // sends too, since that's muscle memory from other chat UIs.
  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    // An IME uses Enter to accept a candidate - that keystroke isn't a send.
    if (e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleSubmit(e);
  }

  function handleConfirm(confirmed) {
    setMessages((m) => [...m, { role: "user", text: confirmed ? "Yes" : "No" }]);
    setPendingQuestion(null);
    send({ confirm: confirmed });
  }

  return (
    <div id="chat-section" className={mobileOpen ? "mobile-open" : ""}>
      <div className="chat-header">
        <span className="chat-header-icon"><IconSparkle className="icon-xs" /></span>
        <div>
          <div className="chat-header-title">Assistant</div>
          <div className="chat-header-subtitle">Create, update, or ask about your tasks</div>
        </div>
      </div>
      <div id="chat-messages" ref={messagesRef}>
        <div className={`chat-aurora${messages.length > 0 ? " is-hidden" : ""}`} aria-hidden="true" />
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>How can I help?</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chat-suggestion" onClick={() => applySuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className={`chat-msg assistant${m.streaming ? " streaming" : ""}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
            </div>
          ) : (
            <div key={i} className="chat-msg user">
              {m.text}
            </div>
          )
        )}
        {/* Between sending and the first token the agent is calling tools, which
            can take a few seconds. Without this the panel just sits there. */}
        {sending && messages[messages.length - 1]?.role === "user" && (
          <div className="chat-msg assistant chat-thinking" aria-label="Assistant is thinking">
            <i /><i /><i />
          </div>
        )}
      </div>
      {pendingQuestion ? (
        <div id="chat-confirm">
          <button onClick={() => handleConfirm(true)}>Yes</button>
          <button className="secondary" onClick={() => handleConfirm(false)}>No</button>
        </div>
      ) : (
        <>
          {messages.length > 0 && !sending && (
            <div className="chat-followups" aria-label="Suggested prompts">
              {pickFollowups(usedSuggestions).map((s) => (
                <button key={s} type="button" className="chat-followup" onClick={() => applySuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask or tell the assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button type="submit" id="chat-send" disabled={sending || !input.trim()} aria-label="Send">
              <IconSend className="icon-xs" />
            </button>
          </form>
          {input.trim() && (
            <div className="chat-hint">
              <kbd>Shift</kbd> + <kbd>↵</kbd> for a new line
            </div>
          )}
        </>
      )}
    </div>
  );
}
