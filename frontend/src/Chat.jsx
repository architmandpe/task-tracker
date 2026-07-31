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

export default function Chat({ onAction, mobileOpen }) {
  const [messages, setMessages] = useState([]); // {role: "user" | "assistant", text, streaming}
  const [input, setInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>How can I help?</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                >
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
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            placeholder="Ask or tell the assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" id="chat-send" disabled={sending || !input.trim()} aria-label="Send">
            <IconSend className="icon-xs" />
          </button>
        </form>
      )}
    </div>
  );
}
