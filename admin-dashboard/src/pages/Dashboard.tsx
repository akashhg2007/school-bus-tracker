import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api, { unwrapList } from '../services/api';

interface DashboardStats {
  totalBuses: number;
  activeBuses: number;
  totalStudents: number;
  studentsOnboard: number;
  activeTrips: number;
  delayedBuses: number;
  totalParents: number;
  totalDrivers: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBuses: 0,
    activeBuses: 0,
    totalStudents: 0,
    studentsOnboard: 0,
    activeTrips: 0,
    delayedBuses: 0,
    totalParents: 0,
    totalDrivers: 0,
  });
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [busesRes, tripsRes, studentsRes, parentsRes, driversRes] = await Promise.all([
        api.get('/buses').catch(() => ({ data: { data: [] } })),
        api.get('/trips/active').catch(() => ({ data: { data: [] } })),
        api.get('/students').catch(() => ({ data: { data: [] } })),
        api.get('/parents', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        api.get('/drivers').catch(() => ({ data: { data: [] } })),
      ]);

      const buses = unwrapList(busesRes.data);
      const trips = unwrapList(tripsRes.data);
      const students = unwrapList(studentsRes.data);
      const parents = unwrapList(parentsRes.data);
      const drivers = unwrapList(driversRes.data);

      const activeBuses = buses.filter((b: any) => b.isActive).length;
      const studentsOnboard = trips.reduce((sum: number, t: any) => sum + (t._count?.attendance || 0), 0);

      const STALE_MS = 5 * 60 * 1000;
      const now = Date.now();
      const delayedTrips = trips.filter((t: any) => {
        const lastLoc = t.gpsLocations?.[0]?.createdAt;
        if (!lastLoc) return true;
        return now - new Date(lastLoc).getTime() > STALE_MS;
      });

      setStats({
        totalBuses: buses.length,
        activeBuses: activeBuses,
        totalStudents: students.length,
        studentsOnboard: studentsOnboard,
        activeTrips: trips.length,
        delayedBuses: delayedTrips.length,
        totalParents: parents.length,
        totalDrivers: drivers.length,
      });

      setActiveTrips(trips.slice(0, 5));
    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const statCards = [
    { label: 'Total Buses', value: stats.totalBuses, color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { label: 'Active Buses', value: stats.activeBuses, color: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Students', value: stats.totalStudents, color: 'from-violet-500 to-violet-600', bgLight: 'bg-violet-50', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Onboard', value: stats.studentsOnboard, color: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Active Trips', value: stats.activeTrips, color: 'from-rose-500 to-red-500', bgLight: 'bg-rose-50', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Delayed', value: stats.delayedBuses, color: stats.delayedBuses > 0 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600', bgLight: stats.delayedBuses > 0 ? 'bg-red-50' : 'bg-emerald-50', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <button onClick={loadDashboardData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
          <p className="text-blue-100 mt-1">Here's what's happening with your fleet today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bgLight} rounded-xl flex items-center justify-center`}>
                <svg className={`w-5 h-5 bg-gradient-to-br ${card.color} bg-clip-text`} style={{ color: card.color.includes('emerald') ? '#059669' : card.color.includes('violet') ? '#7c3aed' : card.color.includes('amber') || card.color.includes('orange') ? '#d97706' : card.color.includes('rose') || card.color.includes('red') ? '#e11d48' : '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.label === 'Delayed' && stats.delayedBuses > 0 ? 'text-red-600' : 'text-gray-800'}`}>{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Fleet Overview</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Buses', value: stats.totalBuses, fill: '#3b82f6' },
                { name: 'Active', value: stats.activeBuses, fill: '#10b981' },
                { name: 'Students', value: stats.totalStudents, fill: '#8b5cf6' },
                { name: 'Onboard', value: stats.studentsOnboard, fill: '#f59e0b' },
                { name: 'Trips', value: stats.activeTrips, fill: '#ef4444' },
                { name: 'Delayed', value: stats.delayedBuses, fill: '#eab308' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Active Trips</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activeTrips.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No active trips right now</p>
              </div>
            ) : (
              activeTrips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{trip.bus?.busNumber || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{trip.driver?.name || 'No driver'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {getStatusText(trip.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
