import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface LeaveRequest {
  id: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  student?: { id: string; name: string; rollNumber: string };
  parent?: { id: string; name: string; phone: string };
}

const LeaveRequests: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const loadLeaves = async () => {
    try {
      const response = await api.get('/leaves', { params: { limit: 100 } });
      setLeaves(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Mark this request as ${status}?`)) return;
    try {
      await api.put(`/leaves/${id}/status`, { status });
      loadLeaves();
    } catch (error) {
      console.error('Error updating leave status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const visible = filter === 'ALL' ? leaves : leaves.filter((l) => l.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Leave Requests</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No leave requests found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visible.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{leave.student?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{leave.student?.rollNumber || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{leave.parent?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{leave.parent?.phone || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(leave.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{leave.reason || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {leave.status === 'PENDING' ? (
                      <>
                        <button onClick={() => updateStatus(leave.id, 'APPROVED')} className="text-green-600 hover:text-green-900 mr-4">Approve</button>
                        <button onClick={() => updateStatus(leave.id, 'REJECTED')} className="text-red-600 hover:text-red-900">Reject</button>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeaveRequests;