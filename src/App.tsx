import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { StudentLayout } from './components/layout/StudentLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminsPage } from './pages/AdminsPage';
import { MyClassesPage } from './pages/MyClassesPage';
import { StudentsPage } from './pages/StudentsPage';
import { GradesPage } from './pages/GradesPage';
import { AttendancePage } from './pages/AttendancePage';
import { HomeworkPage } from './pages/HomeworkPage';
import { RatingPage } from './pages/RatingPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { StudentClassPage } from './pages/student/StudentClassPage';
import { StudentDiaryPage } from './pages/student/StudentDiaryPage';
import { StudentSchedulePage } from './pages/student/StudentSchedulePage';
import { StudentHomeworkPage } from './pages/student/StudentHomeworkPage';
import { StudentGradesPage } from './pages/student/StudentGradesPage';
import { StudentAttendancePage } from './pages/student/StudentAttendancePage';
import { StudentLeaderboardPage } from './pages/student/StudentLeaderboardPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { ChatsPage } from './pages/ChatsPage';
import { TelegramMiniAppPage } from './pages/TelegramMiniAppPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AppLoader } from './components/common/AppLoader';
import { isSuperAdmin } from './utils/adminScope';

const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, accountType } = useAuth();
  if (isLoading) {
    return <AppLoader message="Boshqaruv paneli yuklanmoqda..." />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (accountType === 'student') {
    return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
};

const SuperAdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  if (!isSuperAdmin(user)) {
    return <Navigate to="/my-classes" replace />;
  }
  return <>{children}</>;
};

const StudentOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, accountType } = useAuth();
  if (isLoading) {
    return <AppLoader message="O'quvchi kabineti yuklanmoqda..." />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (accountType === 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, accountType } = useAuth();
  if (isLoading) return <AppLoader />;
  if (isAuthenticated) {
    return <Navigate to={accountType === 'student' ? '/student' : '/'} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Parent-Only Telegram WebApp Mini App (HMAC-token protected) */}
              <Route path="/tg-app" element={<TelegramMiniAppPage />} />

              {/* Dedicated Student Portal Routes */}
              <Route
                path="/student"
                element={
                  <StudentOnlyRoute>
                    <StudentLayout />
                  </StudentOnlyRoute>
                }
              >
                <Route index element={<StudentHomePage />} />
                <Route path="class" element={<StudentClassPage />} />
                <Route path="diary" element={<StudentDiaryPage />} />
                <Route path="schedule" element={<StudentSchedulePage />} />
                <Route path="homework" element={<StudentHomeworkPage />} />
                <Route path="chats" element={<ChatsPage />} />
                <Route path="grades" element={<StudentGradesPage />} />
                <Route path="attendance" element={<StudentAttendancePage />} />
                <Route path="rating" element={<StudentLeaderboardPage />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Admin Panel Routes */}
              <Route
                path="/"
                element={
                  <AdminOnlyRoute>
                    <Layout />
                  </AdminOnlyRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route
                  path="admins"
                  element={
                    <SuperAdminOnlyRoute>
                      <AdminsPage />
                    </SuperAdminOnlyRoute>
                  }
                />
                <Route path="my-classes" element={<MyClassesPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="grades" element={<GradesPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="homework" element={<HomeworkPage />} />
                <Route path="rating" element={<RatingPage />} />
                <Route path="chats" element={<ChatsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
