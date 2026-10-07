import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { BarChart3, Dumbbell, LayoutDashboard, LogOut, ScanLine, Scale, Settings } from 'lucide-react';
import { auth } from '../firebase';
import { useApp } from '../AppContext';

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/body', label: 'Body', icon: Scale },
  { to: '/exercises', label: 'Lifts', icon: Dumbbell },
  { to: '/inbody', label: 'InBody', icon: ScanLine },
  { to: '/charts', label: 'Charts', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const { profile } = useApp();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">FORGE</div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-link' + (isActive ? ' on' : '')}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <div className="avatar">{(profile?.name || '?').slice(0, 1).toUpperCase()}</div>
            <div className="who-name">{profile?.name}</div>
          </div>
          <button className="icon-btn" title="Log out" onClick={() => signOut(auth)}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
      <nav className="tabbar">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
