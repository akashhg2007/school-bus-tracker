import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useToast } from '../components/ui/Toast';

interface Attendance { id: string; type: string; createdAt: string; student?: { name: string }; trip?: { bus?: { busNumber: string }; type: string }; }

const AttendanceReports: React.FC = () => {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useDateFilter, setUseDateFilter] = useState(false);

  useEffect(() => { loadAttendance(); }, [page]);

  const loadAttendance = async () => {
    try {
      setIsLoading(true);
      const params = useDateFilter && startDate && endDate
        ? { startDate, endDate, page, limit: 20 }
        : { page, limit: 20 };
      const res = await api.get(useDateFilter ? '/attendance/report' : '/attendance', { params });
      const data = unwrapList(res.data);
      setAttendance(prev => page === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } catch { toast('error', 'Failed to load attendance'); }
    setIsLoading(false);
  };

  const handleDateFilter = () => { setPage(1); loadAttendance(); };
  const clearDateFilter = () => { setStartDate(''); setEndDate(''); setUseDateFilter(false); setPage(1); setTimeout(() => loadAttendance(), 0); };
  const formatDate = (d: string) => new Date(d).toLocaleString();

  if (isLoading && attendance.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Attendance Reports" />

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm" />
          </div>
          <Button onClick={handleDateFilter} disabled={!startDate || !endDate} size="sm">Filter</Button>
          {useDateFilter && <Button variant="ghost" size="sm" onClick={clearDateFilter}>Clear</Button>}
        </div>
      </div>

      {attendance.length === 0 ? (
        <EmptyState title="No attendance records" description="Records will appear as students board and exit buses." icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Student', 'Type', 'Bus', 'Trip Type', 'Timestamp'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {attendance.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{r.student?.name || 'N/A'}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.type} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{r.trip?.bus?.busNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{r.trip?.type === 'MORNING' ? 'Morning' : 'Evening'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="data-cards flex flex-col gap-3 sm:hidden">
            {attendance.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{r.student?.name || 'N/A'}</p>
                  <StatusBadge status={r.type} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bus: {r.trip?.bus?.busNumber || 'N/A'} &middot; {r.trip?.type === 'MORNING' ? 'Morning' : 'Evening'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setPage(page + 1)}>Load More</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceReports;
