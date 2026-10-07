import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const friendly = (code = '') => {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email or password is incorrect.';
  if (code.includes('email-already-in-use')) return 'This email already has an account. Log in instead.';
  if (code.includes('weak-password')) return 'Password needs at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('popup-closed')) return 'Google sign-in was closed before finishing.';
  return 'Something went wrong. Check your connection and try again.';
};

export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(friendly(err.code)); }
    setBusy(false);
  }
  async function google() {
    setError('');
    try { await signInWithPopup(auth, googleProvider); } catch (err) { setError(friendly(err.code)); }
  }

  return (
    <div className="login">
      <div className="login-hero">
        <div className="login-word">FORGE</div>
        <p>Log every lift. Watch the bar fill. Show up again tomorrow.</p>
        <div className="login-ticks"><i /><i /><i /><i /></div>
      </div>
      <form className="login-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        {mode === 'signup' && (
          <label>Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
          </label>
        )}
        <label>Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>Password
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="btn ghost" onClick={google}>Continue with Google</button>
        <p className="muted center">
          {mode === 'login' ? 'New here?' : 'Already training with us?'}{' '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}
