import { useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap';

/** Centered dialog. Traps keyboard focus, closes with the X button, Escape or a tap on the backdrop, and returns focus to the opener. */
export default function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useFocusTrap(ref, onClose);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}
