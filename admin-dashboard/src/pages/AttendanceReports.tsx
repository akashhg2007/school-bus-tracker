import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Attendance {
  id: string;
  type: string;
  timestamp: string;
  student?: { name: string };
  trip?: { bus?: { busNumber: string }; type: string };
}

const AttendanceReports: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [page]);

  const loadAttendance = async () => {
    try {
      const response = await api.get('/attendance', { params: { page, limit: 20 } });
      const data = response.data?.data || [];
      if (page === 1) {
        setAttendance(data);
      } else {
        setAttendance([...attendance, ...data]);
      }
      setHasMore(data.length === 20);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
    setIsLoading(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BOARDING': return 'bg-green-100 text-green-800';
      case 'DROPOFF': return 'bg-blue-100 text-blue-800';
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
      <h1 className="text-2xl font-bold text-gray-800">Attendance Reports</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">{record.student?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(record.type)}`}>
                    {record.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{record.trip?.bus?.busNumber || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.trip?.type || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(record.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendance.length === 0 && (
          <div className="p-6 text-center text-gray-500">No attendance records found</div>
        )}
      </div>

      {hasMore && attendance.length > 0 && (
        <div className="text-center">
          <button onClick={() => setPage(page + 1)} className="text-blue-600 hover:text-blue-800">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
