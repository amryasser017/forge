import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Camera, Plus, Trash2 } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import ChartCard from '../components/ChartCard';
import Modal from '../components/Modal';
import { COLORS, IN_METRICS, byDate, compressImage, fmtDate, r1, shortDate, todayStr } from '../utils';

const EMPTY = { date: todayStr(), weight: '', muscle: '', fatMass: '', fatPct: '', visceral: '', bmr: '', note: '' };

export default function InBody() {
  const { add, del, show, toKg, unit } = useApp();
  const { items } = useCol('inbody');
  const reports = useMemo(() => [...items].sort(byDate), [items]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [img, setImg] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const disp = (m, v) => (v == null ? null : m.kind === 'mass' ? show(v) : v);
  const suffix = (m) => (m.kind === 'mass' ? ` ${unit}` : m.kind === '%' ? '%' : '');

  async function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { setImg(await compressImage(f)); } catch { alert('Could not read that image. Try a JPG or PNG.'); }
    setBusy(false);
  }
  async function save(e) {
    e.preventDefault();
    const data = { date: form.date, note: form.note.trim(), image: img };
    IN_METRICS.forEach((m) => {
      const raw = form[m.key];
      if (raw === '') data[m.key] = null;
      else data[m.key] = m.kind === 'mass' ? toKg(raw) : parseFloat(raw);
    });
    await add('inbody', data);
    setOpen(false); setForm(EMPTY); setImg('');
  }

  const first = reports[0];
  const lastR = reports[reports.length - 1];
  const A = reports.find((r) => r.id === (a || first?.id));
  const B = reports.find((r) => r.id === (b || lastR?.id));

  const series = (key, name, color) => ({
    data: reports.filter((r) => r[key] != null).map((r) => ({ label: shortDate(r.date), [key]: disp(IN_METRICS.find((m) => m.key === key), r[key]) })),
    series: [{ key, name, color }],
  });
  const muscle = series('muscle', `Muscle (${unit})`, COLORS.ember);
  const fat = series('fatMass', `Fat mass (${unit})`, COLORS.volt);

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">InBody</h1>
        <button className="btn primary" onClick={() => setOpen(true)}><Plus size={18} /> New report</button>
      </div>

      <ChartCard title="Skeletal muscle mass" subtitle={`Each bar is one report · ${unit}`} {...muscle} defaultZoom />
      <ChartCard title="Body fat mass" subtitle={`Each bar is one report · ${unit}`} {...fat} defaultZoom />

      {reports.length >= 2 && A && B && (
        <section className="panel">
          <header className="panel-head">
            <h3>Compare two reports</h3>
            <div className="seg-row">
              <select value={A.id} onChange={(e) => setA(e.target.value)} aria-label="From report">{reports.map((r) => <option key={r.id} value={r.id}>{fmtDate(r.date)}</option>)}</select>
              <span className="muted">to</span>
              <select value={B.id} onChange={(e) => setB(e.target.value)} aria-label="To report">{reports.map((r) => <option key={r.id} value={r.id}>{fmtDate(r.date)}</option>)}</select>
            </div>
          </header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Metric</th><th>{fmtDate(A.date)}</th><th>{fmtDate(B.date)}</th><th>Change</th></tr></thead>
              <tbody>
                {IN_METRICS.map((m) => {
                  const va = disp(m, A[m.key]); const vb = disp(m, B[m.key]);
                  const d = va != null && vb != null ? r1(vb - va) : null;
                  const good = d == null || d === 0 || m.goodUp == null ? null : (d > 0) === m.goodUp;
                  return (
                    <tr key={m.key}>
                      <td>{m.label}</td>
                      <td>{va != null ? va + suffix(m) : '–'}</td>
                      <td>{vb != null ? vb + suffix(m) : '–'}</td>
                      <td className={good == null ? '' : good ? 'up' : 'down'}>
                        {d == null ? '–' : <>{d > 0 ? <ArrowUp size={14} /> : d < 0 ? <ArrowDown size={14} /> : null} {d > 0 ? '+' : ''}{d}{suffix(m)}</>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <header className="panel-head"><h3>Reports</h3></header>
        {reports.length === 0 ? <div className="empty">No reports yet. Add your first InBody result to start tracking muscle and fat.</div> : (
          <ul className="rows">
            {[...reports].reverse().map((r) => (
              <li key={r.id} className="report">
                {r.image ? <button className="thumb" onClick={() => setView(r.image)} aria-label="View report image"><img src={r.image} alt="InBody report" /></button> : <div className="thumb none"><Camera size={20} /></div>}
                <div className="grow">
                  <b>{fmtDate(r.date)}</b>
                  <small>
                    {IN_METRICS.filter((m) => r[m.key] != null).map((m) => `${m.label.replace(' (kcal)', '')}: ${disp(m, r[m.key])}${suffix(m)}`).join(' · ')}
                  </small>
                  {r.note && <p className="note">{r.note}</p>}
                </div>
                <button className="icon-btn" aria-label="Delete report" onClick={() => confirm('Delete this report?') && del('inbody', r.id)}><Trash2 size={17} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <Modal title="New InBody report" onClose={() => setOpen(false)} wide>
          <form className="form" onSubmit={save}>
            <div className="grid3">
              <label>Date<input type="date" required value={form.date} max={todayStr()} onChange={setF('date')} /></label>
              <label>Weight ({unit})<input inputMode="decimal" value={form.weight} onChange={setF('weight')} /></label>
              <label>Skeletal muscle ({unit})<input inputMode="decimal" value={form.muscle} onChange={setF('muscle')} /></label>
              <label>Body fat mass ({unit})<input inputMode="decimal" value={form.fatMass} onChange={setF('fatMass')} /></label>
              <label>Body fat %<input inputMode="decimal" value={form.fatPct} onChange={setF('fatPct')} /></label>
              <label>Visceral fat level<input inputMode="decimal" value={form.visceral} onChange={setF('visceral')} /></label>
              <label>BMR (kcal)<input inputMode="decimal" value={form.bmr} onChange={setF('bmr')} /></label>
            </div>
            <label>Summary / notes<textarea rows={3} value={form.note} onChange={setF('note')} placeholder="How did it go? Anything the report flagged?" /></label>
            <label className="upload">
              <input type="file" accept="image/*" onChange={pick} />
              <span><Camera size={18} /> {busy ? 'Processing…' : img ? 'Image attached. Tap to replace' : 'Upload report image'}</span>
            </label>
            {img && <img className="preview" src={img} alt="Report preview" />}
            <button className="btn primary" disabled={busy}>Save report</button>
          </form>
        </Modal>
      )}
      {view && <Modal title="InBody report" onClose={() => setView('')} wide><img className="preview full" src={view} alt="InBody report" /></Modal>}
    </div>
  );
}
