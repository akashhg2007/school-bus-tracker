import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useToast } from '../components/ui/Toast';

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
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const loadLeaves = async () => {
    try { const res = await api.get('/leaves', { params: { limit: 100 } }); setLeaves(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load leave requests'); }
    setIsLoading(false);
  };

  useEffect(() => { loadLeaves(); }, []);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try { await api.put(`/leaves/${id}/status`, { status }); toast('success', `Request ${status.toLowerCase()}`); loadLeaves(); }
    catch { toast('error', 'Failed to update status'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();
  const visible = filter === 'ALL' ? leaves : leaves.filter((l) => l.status === filter);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Leave Requests"
        actions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
      />

      {visible.length === 0 ? (
        <EmptyState title="No leave requests" description="Requests from parents will appear here." icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Student', 'Parent', 'Date', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {visible.map((leave) => (
                  <tr key={leave.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{leave.student?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{leave.student?.rollNumber || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800 dark:text-white">{leave.parent?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{leave.parent?.phone || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(leave.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{leave.reason || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={leave.status} /></td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(leave.id, 'APPROVED')}>Approve</Button>
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(leave.id, 'REJECTED')}>Reject</Button>
                        </div>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="data-cards flex flex-col gap-3 sm:hidden">
            {visible.map((leave) => (
              <div key={leave.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{leave.student?.name || 'N/A'}</p>
                  <StatusBadge status={leave.status} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Parent: {leave.parent?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(leave.date)} &middot; {leave.reason || 'No reason'}</p>
                {leave.status === 'PENDING' && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => updateStatus(leave.id, 'APPROVED')} className="text-sm text-green-600 dark:text-green-400 font-medium">Approve</button>
                    <button onClick={() => updateStatus(leave.id, 'REJECTED')} className="text-sm text-red-600 dark:text-red-400 font-medium">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveRequests;
