import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const Layout = lazy(() => import('./components/layout/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BusManagement = lazy(() => import('./pages/BusManagement'));
const DriverManagement = lazy(() => import('./pages/DriverManagement'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const Parents = lazy(() => import('./pages/Parents'));
const RouteManagement = lazy(() => import('./pages/RouteManagement'));
const LiveTracking = lazy(() => import('./pages/LiveTracking'));
const TripHistory = lazy(() => import('./pages/TripHistory'));
const AttendanceReports = lazy(() => import('./pages/AttendanceReports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const LeaveRequests = lazy(() => import('./pages/LeaveRequests'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Maintenance = lazy(() => import('./pages/Maintenance'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="buses" element={<BusManagement />} />
                  <Route path="drivers" element={<DriverManagement />} />
                  <Route path="students" element={<StudentManagement />} />
                  <Route path="parents" element={<Parents />} />
                  <Route path="routes" element={<RouteManagement />} />
                  <Route path="tracking" element={<LiveTracking />} />
                  <Route path="trips" element={<TripHistory />} />
                  <Route path="attendance" element={<AttendanceReports />} />
                  <Route path="leave-requests" element={<LeaveRequests />} />
                  <Route path="announcements" element={<Announcements />} />
                  <Route path="maintenance" element={<Maintenance />} />
                  <Route path="notifications" element={<Notifications />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
