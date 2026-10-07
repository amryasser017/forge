import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Body from './pages/Body';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import InBody from './pages/InBody';
import Charts from './pages/Charts';
import Settings from './pages/Settings';

export default function App() {
  const { user, profile } = useApp();
  if (user === undefined || (user && !profile)) return <div className="splash">FORGE</div>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/body" element={<Body />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/inbody" element={<InBody />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
