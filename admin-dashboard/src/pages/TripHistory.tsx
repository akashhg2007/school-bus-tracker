import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useToast } from '../components/ui/Toast';

interface Trip { id: string; type: string; status: string; startTime: string; endTime?: string; bus?: { busNumber: string }; driver?: { name: string }; }

const TripHistory: React.FC = () => {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => { loadTrips(); }, [page]);

  const loadTrips = async () => {
    try {
      const res = await api.get('/trips/history', { params: { page, limit: 20 } });
      const data = unwrapList(res.data);
      setTrips(prev => page === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } catch { toast('error', 'Failed to load trips'); }
    setIsLoading(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Trip History" />

      {trips.length === 0 ? (
        <EmptyState title="No trip history" description="Trips will appear here after drivers complete them." icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Bus', 'Driver', 'Type', 'Status', 'Start Time', 'End Time'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {trips.map((trip) => (
                  <tr key={trip.id} className="table-row-hover">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{trip.bus?.busNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{trip.driver?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{trip.type === 'MORNING' ? 'Morning' : 'Evening'}</td>
                    <td className="px-6 py-4"><StatusBadge status={trip.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(trip.startTime)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{trip.endTime ? formatDate(trip.endTime) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="data-cards flex flex-col gap-3 sm:hidden">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{trip.bus?.busNumber || 'N/A'}</p>
                  <StatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{trip.driver?.name || 'N/A'} &middot; {trip.type === 'MORNING' ? 'Morning' : 'Evening'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(trip.startTime)}{trip.endTime ? ` - ${formatDate(trip.endTime)}` : ''}</p>
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

export default TripHistory;
