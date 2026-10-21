/** The signature element: a loaded-barbell style progress bar. */
export default function PlateBar({ pct, start, current, target, unit }) {
  const p = pct ?? 0;
  return (
    <div className="plate">
      <div className="plate-track">
        <div className="plate-fill" style={{ width: `${p}%` }} />
        {[25, 50, 75].map((n) => (
          <i key={n} className="plate-notch" style={{ left: `${n}%` }} />
        ))}
        <div className="plate-disc" style={{ left: `${p}%` }}>
          <span>{current}</span>
        </div>
      </div>
      <div className="plate-labels">
        <div>
          <b>{start}</b>
          <small>Start · {unit}</small>
        </div>
        <div className="right">
          <b>{target}</b>
          <small>Target · {unit}</small>
        </div>
      </div>
    </div>
  );
}
