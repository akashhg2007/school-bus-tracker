import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { unwrapList } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useToast } from '../components/ui/Toast';

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
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalBuses: 0, activeBuses: 0, totalStudents: 0, studentsOnboard: 0,
    activeTrips: 0, delayedBuses: 0, totalParents: 0, totalDrivers: 0,
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
        totalBuses: buses.length, activeBuses, totalStudents: students.length,
        studentsOnboard, activeTrips: trips.length, delayedBuses: delayedTrips.length,
        totalParents: parents.length, totalDrivers: drivers.length,
      });

      setActiveTrips(trips.slice(0, 5));
    } catch (error) {
      setError('Failed to load dashboard data');
      toast('error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="stats" />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button onClick={loadDashboardData} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Buses', value: stats.totalBuses, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { label: 'Active Buses', value: stats.activeBuses, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Students', value: stats.totalStudents, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Onboard', value: stats.studentsOnboard, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Active Trips', value: stats.activeTrips, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Delayed', value: stats.delayedBuses, color: stats.delayedBuses > 0 ? 'text-red-600' : 'text-emerald-600', bg: stats.delayedBuses > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z', urgent: stats.delayedBuses > 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
          <p className="text-blue-100 mt-1">Here's what's happening with your fleet today.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
          <div key={card.label} className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 ${card.urgent ? 'ring-2 ring-red-200 dark:ring-red-800 animate-pulse' : ''}`}>
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <svg className={`w-5 h-5 ${card.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
              </svg>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Active trips section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Active Trips</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{activeTrips.length} trip{activeTrips.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {activeTrips.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active trips right now</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Trips will appear here when drivers start them</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {activeTrips.map((trip) => (
              <div key={trip.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{trip.bus?.busNumber || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{trip.driver?.name || 'No driver'} &middot; {trip.type === 'MORNING' ? 'Morning' : 'Evening'}</p>
                    </div>
                  </div>
                  <StatusBadge status={trip.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fleet Utilization</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {stats.totalBuses > 0 ? Math.round((stats.activeBuses / stats.totalBuses) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stats.activeBuses} of {stats.totalBuses}</p>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.totalBuses > 0 ? (stats.activeBuses / stats.totalBuses) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Students on Board</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {stats.totalStudents > 0 ? Math.round((stats.studentsOnboard / stats.totalStudents) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stats.studentsOnboard} of {stats.totalStudents}</p>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.totalStudents > 0 ? (stats.studentsOnboard / stats.totalStudents) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Size</p>
          <div className="flex items-center gap-6 mt-2">
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDrivers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drivers</p>
            </div>
            <div className={`w-px h-10 bg-gray-200 dark:bg-gray-700`}></div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalParents}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Parents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
