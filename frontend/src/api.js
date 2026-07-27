async function request(path, options = {}) {
  const resp = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return resp;
}

export function login(email, password) {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function signup(email, password) {
  return request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function listTasks() {
  return request("/tasks");
}

export function getAuditLog() {
  return request("/assistant/audit");
}

const CONFIRM_PREFIX = "[CONFIRM_REQUIRED] ";
const STREAM_TIMEOUT_MS = 90000;

// Streams the assistant's reply via SSE, calling onEvent for each piece:
// {type: "content", text} - a chunk of narration/tool-result text to append
// {type: "confirm_required", text} - the assistant is asking for delete confirmation
// {type: "error", text} - the request failed, or the connection was lost mid-stream
export async function streamChat(body, onEvent) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const resp = await fetch("/assistant/stream", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      onEvent({ type: "error", text: data.detail || "Something went wrong." });
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (!frame.startsWith("data: ")) continue;

        const text = frame.slice("data: ".length);
        if (text === "[DONE]") return;
        if (text.startsWith(CONFIRM_PREFIX)) {
          onEvent({ type: "confirm_required", text: text.slice(CONFIRM_PREFIX.length) });
        } else {
          onEvent({ type: "content", text });
        }
      }
    }
  } catch {
    onEvent({ type: "error", text: "Connection to the assistant was lost. Please try again." });
  } finally {
    clearTimeout(timeoutId);
  }
}
