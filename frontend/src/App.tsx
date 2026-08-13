import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompanyPage from './pages/CompanyPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/company/:id" element={<CompanyPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
