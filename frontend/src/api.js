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

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function getMe() {
  return request("/auth/me");
}

export function listTasks() {
  return request("/tasks");
}

export function createTask(fields) {
  return request("/tasks", { method: "POST", body: JSON.stringify(fields) });
}

export function updateTask(id, fields) {
  return request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: "DELETE" });
}

export function getAuditLog() {
  return request("/assistant/audit");
}

export function searchTasks(query) {
  return request("/assistant/search", { method: "POST", body: JSON.stringify({ query }) });
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

        // Each frame's payload is JSON-encoded on the backend (see copilot's /stream)
        // so a chunk containing a literal newline - e.g. mid-stream inside a numbered
        // list - can't collide with the blank-line SSE frame terminator above.
        const text = JSON.parse(frame.slice("data: ".length));
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
