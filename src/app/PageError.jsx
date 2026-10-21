import { Link } from 'react-router-dom';

/** Shown in place of a page that crashed; the navigation around it keeps working. */
export default function PageError({ reset }) {
  return (
    <div className="panel error-card" role="alert">
      <h3>This page ran into a problem</h3>
      <p className="muted">The rest of Forge is still working. Try again, or go back to Home.</p>
      <div className="error-actions">
        <button type="button" className="btn primary" onClick={reset}>Try again</button>
        <Link to="/" className="btn ghost" onClick={reset}>Go to Home</Link>
      </div>
    </div>
  );
}

/** Last resort: something outside the pages failed (for example the layout). */
export function AppCrash() {
  return (
    <div className="splash" role="alert" style={{ flexDirection: 'column', gap: '1rem' }}>
      <span>FORGE</span>
      <p className="muted" style={{ fontSize: '1rem' }}>Something went wrong. Your data is safe.</p>
      <button type="button" className="btn primary" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
