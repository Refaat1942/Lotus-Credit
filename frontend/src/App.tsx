import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompanyPage from './pages/CompanyPage';
import AdminPage from './pages/AdminPage';

import SmartAssistant from './components/SmartAssistant';
import DocumentTitle from './components/DocumentTitle';

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/company/:id" element={<CompanyPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <SmartAssistant />
    </>
  );
}
