import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminPage } from './pages/AdminPage';
import { ExamPage } from './pages/ExamPage';
import { HomePage } from './pages/HomePage';
import { PracticePage } from './pages/PracticePage';

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
