import { useEffect } from 'react';

/** Bottom message with an Undo button; it dismisses itself after a few seconds. `toast` = { id, text, onUndo }. */
export default function UndoToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!toast) return null;
  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.onUndo && <button type="button" onClick={() => { toast.onUndo(); onDismiss(); }}>Undo</button>}
      <button type="button" className="undo-x" aria-label="Dismiss" onClick={onDismiss}>×</button>
    </div>
  );
}
