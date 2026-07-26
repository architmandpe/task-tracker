import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChat } from "./api";

export default function Chat({ onAction }) {
  const [messages, setMessages] = useState([]); // {role: "user" | "assistant", text, streaming}
  const [input, setInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);

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
    <div id="chat-section">
      <h3>Assistant</h3>
      <div id="chat-messages" ref={messagesRef}>
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
      </div>
      {pendingQuestion ? (
        <div id="chat-confirm">
          <button onClick={() => handleConfirm(true)}>Yes</button>
          <button className="secondary" onClick={() => handleConfirm(false)}>No</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Ask or tell the assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
        </form>
      )}
    </div>
  );
}
