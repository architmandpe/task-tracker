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

const CONFIRM_PREFIX = "[CONFIRM_REQUIRED] ";

// Streams the assistant's reply via SSE, calling onEvent for each piece:
// {type: "content", text} - a chunk of narration/tool-result text to append
// {type: "confirm_required", text} - the assistant is asking for delete confirmation
// {type: "error", text} - request failed before/without streaming (e.g. rate limit)
export async function streamChat(body, onEvent) {
  const resp = await fetch("/assistant/stream", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
}
