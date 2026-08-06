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
  });
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [busesRes, tripsRes, studentsRes] = await Promise.all([
        api.get('/buses').catch(() => ({ data: { data: [] } })),
        api.get('/trips/active').catch(() => ({ data: { data: [] } })),
        api.get('/students').catch(() => ({ data: { data: [] } })),
      ]);

      const buses = unwrapList(busesRes.data);
      const trips = unwrapList(tripsRes.data);
      const students = unwrapList(studentsRes.data);

      const activeBuses = buses.filter((b: any) => b.isActive).length;
      const studentsOnboard = trips.reduce((sum: number, t: any) => sum + (t._count?.attendance || 0), 0);

      // A bus is "delayed" if its active trip has no GPS update in the last 5 minutes
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
      });

      setActiveTrips(trips.slice(0, 5));
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name || 'Admin'}!
        </h1>
        <p className="text-gray-500 mt-1">Green Valley School</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Buses</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalBuses}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Buses</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeBuses}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-orange-600">{stats.totalStudents}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Students Onboard</p>
              <p className="text-3xl font-bold text-orange-600">{stats.studentsOnboard}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Trips</p>
              <p className="text-3xl font-bold text-red-600">{stats.activeTrips}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Delayed Buses</p>
              <p className={`text-3xl font-bold ${stats.delayedBuses > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.delayedBuses}</p>
            </div>
            <div className={`p-3 rounded-full ${stats.delayedBuses > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${stats.delayedBuses > 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Fleet Overview</h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[
              { name: 'Buses', value: stats.totalBuses, fill: '#3b82f6' },
              { name: 'Active Buses', value: stats.activeBuses, fill: '#22c55e' },
              { name: 'Students', value: stats.totalStudents, fill: '#f97316' },
              { name: 'Onboard', value: stats.studentsOnboard, fill: '#a855f7' },
              { name: 'Active Trips', value: stats.activeTrips, fill: '#ef4444' },
              { name: 'Delayed', value: stats.delayedBuses, fill: '#eab308' },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Active Trips</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {activeTrips.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No active trips
            </div>
          ) : (
            activeTrips.map((trip) => (
              <div key={trip.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{trip.bus?.busNumber || 'N/A'}</h3>
                      <p className="text-sm text-gray-500">{trip.driver?.name || 'No driver'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {getStatusText(trip.status)}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{trip.type || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
