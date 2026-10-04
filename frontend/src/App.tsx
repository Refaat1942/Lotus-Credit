import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompanyPage from './pages/CompanyPage';
import AdminPage from './pages/AdminPage';
import BranchLoginPage from './pages/BranchLoginPage';

import SmartAssistant from './components/SmartAssistant';
import DocumentTitle from './components/DocumentTitle';
import { authHeader, canUse, getSession, setSession, useSession } from './utils/session';

/** The pharmacist side: asks for a branch login first when the owner made it mandatory. */
function PublicApp() {
  const session = useSession();
  const [requireLogin, setRequireLogin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/public-config')
      .then((r) => r.json())
      .then((c) => setRequireLogin(!!c.requireLogin))
      .catch(() => setRequireLogin(false));
  }, []);

  // refresh the stored account so permission changes made by the owner apply on next visit
  useEffect(() => {
    if (!getSession()) return;
    fetch('/api/auth/me', { headers: authHeader() })
      .then(async (r) => {
        const s = getSession();
        if (r.status === 401) setSession(null);
        else if (r.ok && s) setSession({ token: s.token, user: (await r.json()).user });
      })
      .catch(() => {});
  }, [session?.token]);

  if (requireLogin === null) return null;
  if (requireLogin && !session) return <BranchLoginPage required />;

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/company/:id" element={<CompanyPage />} />
        <Route path="/login" element={<BranchLoginPage />} />
      </Routes>
      {canUse(session, 'assistant') && <SmartAssistant />}
    </>
  );
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<PublicApp />} />
      </Routes>
    </>
  );
}
