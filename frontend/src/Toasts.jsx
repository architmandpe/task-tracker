export default function Toasts({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div id="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => onDismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
