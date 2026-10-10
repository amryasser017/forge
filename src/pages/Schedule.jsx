import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import Modal from '../components/Modal';
import { DAY_NAMES, WEEK_ORDER } from '../utils';

const order = (a, b) =>
  ((a.weekday == null ? 9 : (a.weekday + 1) % 7)) - ((b.weekday == null ? 9 : (b.weekday + 1) % 7)) || (a.createdAt?.seconds ?? 9e12) - (b.createdAt?.seconds ?? 9e12);

function DayForm({ initial, onSave, onClose, title }) {
  const [weekday, setWeekday] = useState(initial?.weekday ?? new Date().getDay());
  const [name, setName] = useState(initial?.name ?? '');
  const custom = weekday === -1;
  function submit(e) {
    e.preventDefault();
    const n = name.trim() || (custom ? '' : DAY_NAMES[weekday]);
    if (!n) return;
    onSave({ name: n, weekday: custom ? null : weekday });
    onClose();
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Day
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEK_ORDER.map((i) => <option key={i} value={i}>{DAY_NAMES[i]}</option>)}
            <option value={-1}>Custom (no fixed weekday)</option>
          </select>
        </label>
        <label>Name (optional, e.g. Push day)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={custom ? 'Required' : DAY_NAMES[weekday]} />
        </label>
        <button className="btn primary">Save</button>
      </form>
    </Modal>
  );
}

export default function Schedule() {
  const { add, upd, del } = useApp();
  const days = [...useCol('schedule').items].sort(order);
  const exercises = useCol('exercises').items.filter((x) => !x.archived).sort((a, b) => a.name.localeCompare(b.name));
  const [form, setForm] = useState(null); // {} for new, day object for edit
  const [picking, setPicking] = useState(null); // day id
  const [open, setOpen] = useState(() => new Set()); // expanded day ids; cards start collapsed
  const flip = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const byId = Object.fromEntries(exercises.map((x) => [x.id, x]));
  const setEx = (day, ids) => upd('schedule', day.id, { exerciseIds: ids });
  const move = (day, i, dir) => {
    const ids = [...(day.exerciseIds || [])];
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    setEx(day, ids);
  };
  const toggle = (day, id) => {
    const ids = day.exerciseIds || [];
    setEx(day, ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };
  const pickDay = days.find((d) => d.id === picking);

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">Schedule</h1>
        <button className="btn primary" onClick={() => setForm({})}><Plus size={18} /> Add day</button>
      </div>

      {days.length === 0 ? (
        <div className="panel empty">Plan your week: add a day (Saturday, Sunday, or your own name), then pick the exercises for it.</div>
      ) : (
        <div className="sched-list">
          {days.map((d) => {
            const ids = (d.exerciseIds || []).filter((id) => byId[id]);
            const isOpen = open.has(d.id);
            return (
              <section key={d.id} className="panel sched-day">
                <div className="sched-head">
                  <button className="sched-toggle" aria-expanded={isOpen} onClick={() => flip(d.id)}>
                    <h4>{d.name}</h4>
                    <small>{ids.length} {ids.length === 1 ? 'exercise' : 'exercises'}</small>
                    <ChevronDown size={20} className={'chev' + (isOpen ? ' open' : '')} />
                  </button>
                  <button className="icon-btn" aria-label="Edit day" onClick={() => setForm(d)}><Pencil size={18} /></button>
                  <button className="icon-btn danger" aria-label="Delete day" onClick={() => window.confirm(`Delete ${d.name}?`) && del('schedule', d.id)}><Trash2 size={18} /></button>
                </div>
                {isOpen && (ids.length === 0 ? <small>No exercises yet.</small> : (
                  <ul className="rows">
                    {ids.map((id, i) => (
                      <li key={id}>
                        <div><b>{byId[id].name}</b></div>
                        <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move({ ...d, exerciseIds: ids }, i, -1)}><ArrowUp size={16} /></button>
                        <button className="icon-btn" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => move({ ...d, exerciseIds: ids }, i, 1)}><ArrowDown size={16} /></button>
                        <button className="icon-btn danger" aria-label="Remove" onClick={() => setEx(d, ids.filter((x) => x !== id))}><X size={16} /></button>
                      </li>
                    ))}
                  </ul>
                ))}
                {isOpen && <button className="btn ghost" onClick={() => setPicking(d.id)}><Plus size={16} /> Exercises</button>}
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <DayForm
          title={form.id ? 'Edit day' : 'Add day'}
          initial={form.id ? form : null}
          onClose={() => setForm(null)}
          onSave={(data) => (form.id ? upd('schedule', form.id, data) : add('schedule', { ...data, exerciseIds: [] }))}
        />
      )}

      {pickDay && (
        <Modal title={`Exercises for ${pickDay.name}`} onClose={() => setPicking(null)}>
          {exercises.length === 0 ? (
            <div className="empty">Add exercises in the Lifts tab first.</div>
          ) : (
            exercises.map((x) => {
              const on = (pickDay.exerciseIds || []).includes(x.id);
              return (
                <label key={x.id} className={'pick' + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} onChange={() => toggle(pickDay, x.id)} />
                  {x.name}
                </label>
              );
            })
          )}
          <button className="btn primary" onClick={() => setPicking(null)}>Done</button>
        </Modal>
      )}
    </div>
  );
}
