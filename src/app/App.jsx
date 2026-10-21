import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from '../AppContext';
import Layout from './Layout';
import Login from '../identity/Login';
import Dashboard from './views/Dashboard';
import Body from '../body/BodyPage';
import Exercises from './views/Lifts';
import ExerciseDetail from './views/ExerciseDetail';
import InBody from '../inbody/InBodyPage';
import Charts from './views/Charts';
import Plan from './views/PlanPage';
import Settings from './views/Settings';

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
        <Route path="/schedule" element={<Plan />} />
        <Route path="/inbody" element={<InBody />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
