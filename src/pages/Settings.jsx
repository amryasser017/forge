import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../AppContext';
import { WEEK_GOAL } from '../utils';

export default function Settings() {
  const { profile, user, saveProfile } = useApp();
  const [name, setName] = useState(profile.name || '');
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    await saveProfile({ name: name.trim() || profile.name });
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Settings</h1>
      <form className="panel form" onSubmit={save}>
        <label>Display name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Email<input value={user.email || ''} disabled /></label>
        <div>
          <span className="label-text">Units</span>
          <div className="seg-group">
            <button type="button" className={'seg' + (profile.unit === 'kg' ? ' on' : '')} onClick={() => saveProfile({ unit: 'kg' })}>Kilograms</button>
            <button type="button" className={'seg' + (profile.unit === 'lb' ? ' on' : '')} onClick={() => saveProfile({ unit: 'lb' })}>Pounds</button>
          </div>
          <p className="muted">Everything is stored in kg, so switching units never changes your data.</p>
        </div>
        <div>
          <span className="label-text">Gym days per week (used until you build a plan)</span>
          <div className="seg-group">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button type="button" key={n} className={'seg' + ((profile.weeklyGoal ?? WEEK_GOAL) === n ? ' on' : '')} onClick={() => saveProfile({ weeklyGoal: n })}>{n}</button>
            ))}
          </div>
          <p className="muted">Once you add days in the Plan tab, the number of planned days is your weekly goal instead.</p>
        </div>
        <button className="btn primary">{saved ? 'Saved' : 'Save changes'}</button>
      </form>
      <button className="btn ghost" onClick={() => signOut(auth)}>Log out</button>
    </div>
  );
}
