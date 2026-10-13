import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/** − [number] + control with 44px buttons. The field can be typed into; it is clamped on blur. */
export default function Stepper({ label, value, onChange, min = 1, max = 99, step = 1, decimals = 0, suffix }) {
  const [text, setText] = useState(String(value ?? ''));
  useEffect(() => setText(String(value ?? '')), [value]);
  const clamp = (n) => Math.max(min, Math.min(max, Number(n.toFixed(decimals))));
  const commit = () => {
    const n = parseFloat(text);
    if (Number.isNaN(n)) { setText(String(value ?? '')); return; }
    onChange(clamp(n));
  };
  const bump = (d) => onChange(clamp((Number(value) || 0) + d * step));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => bump(-1)} disabled={Number(value) <= min}><Minus size={16} /></button>
      <input inputMode={decimals ? 'decimal' : 'numeric'} aria-label={label} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())} />
      {suffix && <span className="stepper-suffix">{suffix}</span>}
      <button type="button" aria-label={`Increase ${label}`} onClick={() => bump(1)} disabled={Number(value) >= max}><Plus size={16} /></button>
    </div>
  );
}
