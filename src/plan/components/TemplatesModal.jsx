import { useState } from 'react';
import { Modal } from '@forge/ui';
import { TEMPLATES } from '../planTemplates';
import { DAYS, planHasItems } from '../plan';

/** Pick a starter plan. Asks before replacing a plan that already has exercises. */
export default function TemplatesModal({ plan, libData, onApply, onClose }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  async function choose(t) {
    if (planHasItems(plan) && !window.confirm(`Replace your current weekly plan with "${t.name}"? Your current plan will be overwritten.`)) return;
    setBusy(t.key);
    try { await onApply(t, libData); onClose(); } catch { setError('Could not apply the template. Check your connection and try again.'); setBusy(null); }
  }
  return (
    <Modal title="Starter plans" onClose={onClose}>
      {!libData && <p className="muted" role="status">Loading the exercise library…</p>}
      <ul className="template-list">
        {TEMPLATES.map((t) => (
          <li key={t.key}>
            <button type="button" className="template" disabled={!libData || !!busy} onClick={() => choose(t)}>
              <b>{t.name}</b>
              <small className="muted">{t.blurb}</small>
              <span className="template-week" aria-hidden>{DAYS.map((d, i) => <i key={d.key} className={t.week[i] ? 'on' : ''} title={d.name}>{d.short[0]}</i>)}</span>
              {busy === t.key && <small>Applying…</small>}
            </button>
          </li>
        ))}
      </ul>
      {error && <div className="error">{error}</div>}
      <p className="muted">Everything stays editable afterwards. Exercises come from the library, with popular choices for each day.</p>
    </Modal>
  );
}
