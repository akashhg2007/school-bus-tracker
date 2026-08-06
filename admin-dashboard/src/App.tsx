import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BusManagement from './pages/BusManagement';
import DriverManagement from './pages/DriverManagement';
import StudentManagement from './pages/StudentManagement';
import RouteManagement from './pages/RouteManagement';
import LiveTracking from './pages/LiveTracking';
import TripHistory from './pages/TripHistory';
import AttendanceReports from './pages/AttendanceReports';
import Notifications from './pages/Notifications';

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
            <Route path="routes" element={<RouteManagement />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="trips" element={<TripHistory />} />
            <Route path="attendance" element={<AttendanceReports />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
