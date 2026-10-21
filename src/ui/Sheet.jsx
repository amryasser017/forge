import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap';

/**
 * Bottom sheet on phones (full height), centred panel on desktop.
 * Closes with the X button, Escape, a tap on the backdrop or by swiping down on the header.
 * Focus is trapped while open and returned to the opener afterwards.
 */
export default function Sheet({ title, onClose, children, headerExtra }) {
  const ref = useRef(null);
  const y0 = useRef(null);
  const [dy, setDy] = useState(0);
  useFocusTrap(ref, onClose);

  const down = (e) => { y0.current = e.touches[0].clientY; };
  const move = (e) => { if (y0.current != null) setDy(Math.max(0, e.touches[0].clientY - y0.current)); };
  const up = () => { if (dy > 90) onClose(); setDy(0); y0.current = null; };

  return (
    <div className="sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}>
        <div className="sheet-head" onTouchStart={down} onTouchMove={move} onTouchEnd={up}>
          <span className="sheet-grab" aria-hidden />
          <div className="sheet-title"><h3>{title}</h3>{headerExtra}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
