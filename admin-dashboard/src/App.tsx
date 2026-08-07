import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BusManagement from './pages/BusManagement';
import DriverManagement from './pages/DriverManagement';
import StudentManagement from './pages/StudentManagement';
import Parents from './pages/Parents';
import RouteManagement from './pages/RouteManagement';
import LiveTracking from './pages/LiveTracking';
import TripHistory from './pages/TripHistory';
import AttendanceReports from './pages/AttendanceReports';
import Notifications from './pages/Notifications';
import LeaveRequests from './pages/LeaveRequests';
import Announcements from './pages/Announcements';
import Maintenance from './pages/Maintenance';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
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
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
