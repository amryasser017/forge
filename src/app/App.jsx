import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, ProfileProvider, useProfile, Login } from '@forge/identity';
import { DataStoreProvider } from '@forge/datastore';
import { UnitsProvider } from '@forge/shared';
import Layout from './Layout';
import Dashboard from './views/Dashboard';
import Body from '../body/BodyPage';
import Exercises from './views/Lifts';
import ExerciseDetail from './views/ExerciseDetail';
import InBody from '../inbody/InBodyPage';
import Charts from './views/Charts';
import Plan from './views/PlanPage';
import Settings from './views/Settings';

const Splash = () => <div className="splash">FORGE</div>;

/** Wires the components together: session -> data store (needs the uid) -> profile -> units. */
export default function App() {
  const { user } = useAuth();
  if (user === undefined) return <Splash />;
  if (!user) return <Login />;
  return (
    <DataStoreProvider uid={user.uid}>
      <ProfileProvider user={user} fallback={<Splash />}>
        <Shell />
      </ProfileProvider>
    </DataStoreProvider>
  );
}

function Shell() {
  const { profile } = useProfile();
  return (
    <UnitsProvider unit={profile.unit || 'kg'}>
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
    </UnitsProvider>
  );
}
