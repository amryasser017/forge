import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, ProfileProvider, useProfile, Login } from '@forge/identity';
import { DataStoreProvider } from '@forge/datastore';
import { UnitsProvider } from '@forge/shared';
import { ErrorBoundary } from '@forge/ui';
import Layout from './Layout';
import PageError, { AppCrash } from './PageError';
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
    <ErrorBoundary fallback={() => <AppCrash />}>
      <DataStoreProvider uid={user.uid}>
        <ProfileProvider user={user} fallback={<Splash />}>
          <Shell />
        </ProfileProvider>
      </DataStoreProvider>
    </ErrorBoundary>
  );
}

function Shell() {
  const { profile } = useProfile();
  const { pathname } = useLocation();
  return (
    <UnitsProvider unit={profile.unit || 'kg'}>
    <Layout>
      {/* A crash in one page shows PageError here; the navigation keeps working and moving to another page resets it. */}
      <ErrorBoundary resetKey={pathname} fallback={(error, reset) => <PageError reset={reset} />}>
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
      </ErrorBoundary>
    </Layout>
    </UnitsProvider>
  );
}
