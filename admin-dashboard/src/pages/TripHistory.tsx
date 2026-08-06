import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface Trip {
  id: string;
  type: string;
  status: string;
  startTime: string;
  endTime?: string;
  bus?: { busNumber: string };
  driver?: { name: string };
}

const TripHistory: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [page]);

  const loadTrips = async () => {
    try {
      const response = await api.get('/trips/history', { params: { page, limit: 20 } });
      const data = unwrapList(response.data);
      if (page === 1) {
        setTrips(data);
      } else {
        setTrips([...trips, ...data]);
      }
      setHasMore(data.length === 20);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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
      <h1 className="text-2xl font-bold text-gray-800">Trip History</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td className="px-6 py-4 whitespace-nowrap">{trip.bus?.busNumber || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{trip.driver?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{trip.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(trip.startTime)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{trip.endTime ? formatDate(trip.endTime) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trips.length === 0 && (
          <div className="p-6 text-center text-gray-500">No trip history found</div>
        )}
      </div>

      {hasMore && trips.length > 0 && (
        <div className="text-center">
          <button onClick={() => setPage(page + 1)} className="text-blue-600 hover:text-blue-800">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default TripHistory;
