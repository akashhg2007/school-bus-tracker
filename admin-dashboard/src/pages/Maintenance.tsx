import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

interface MaintenanceRecord {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  bus?: { id: string; busNumber: string };
}

const Maintenance: React.FC = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [buses, setBuses] = useState<Array<{ id: string; busNumber: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ busId: '', title: '', description: '', dueDate: new Date().toISOString().slice(0, 10) });

  const loadRecords = async () => {
    try { const res = await api.get('/maintenance', { params: { limit: 100 } }); setRecords(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load maintenance'); }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecords();
    api.get('/buses', { params: { limit: 100 } }).then(res => setBuses(unwrapList(res.data))).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { busId: formData.busId, title: formData.title.trim(), dueDate: formData.dueDate };
      if (formData.description.trim()) payload.description = formData.description.trim();
      await api.post('/maintenance', payload);
      toast('success', 'Maintenance scheduled');
      setShowModal(false);
      setFormData({ busId: '', title: '', description: '', dueDate: new Date().toISOString().slice(0, 10) });
      loadRecords();
    } catch { toast('error', 'Failed to save'); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: 'PENDING' | 'COMPLETED') => {
    try { await api.put(`/maintenance/${id}/status`, { status }); toast('success', `Marked as ${status.toLowerCase()}`); loadRecords(); }
    catch { toast('error', 'Failed to update'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/maintenance/${deleteTarget.id}`); toast('success', 'Record deleted'); loadRecords(); }
    catch { toast('error', 'Failed to delete'); }
    setDeleteTarget(null);
  };

  const isOverdue = (r: MaintenanceRecord) => r.status === 'PENDING' && new Date(r.dueDate) < new Date();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Maintenance" actions={<Button size="sm" onClick={() => setShowModal(true)}>+ Schedule Maintenance</Button>} />

      {records.length === 0 ? (
        <EmptyState title="No maintenance records" description="Schedule maintenance to keep your fleet in top shape." icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" action={<Button onClick={() => setShowModal(true)}>+ Schedule</Button>} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Bus', 'Task', 'Notes', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {records.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{r.bus?.busNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{r.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{r.description || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={isOverdue(r) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                        {new Date(r.dueDate).toLocaleDateString()}{isOverdue(r) ? ' (overdue)' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'} /></td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'PENDING' ? (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'COMPLETED')}>Mark Done</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'PENDING')}>Reopen</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="data-cards flex flex-col gap-3 sm:hidden">
            {records.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{r.title}</p>
                  <StatusBadge status={r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bus: {r.bus?.busNumber || 'N/A'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due: {new Date(r.dueDate).toLocaleDateString()}{isOverdue(r) ? ' (overdue)' : ''}</p>
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {r.status === 'PENDING' ? (
                    <button onClick={() => updateStatus(r.id, 'COMPLETED')} className="text-sm text-green-600 dark:text-green-400 font-medium">Mark Done</button>
                  ) : (
                    <button onClick={() => updateStatus(r.id, 'PENDING')} className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Reopen</button>
                  )}
                  <button onClick={() => setDeleteTarget(r)} className="text-sm text-red-600 dark:text-red-400 font-medium">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule Maintenance">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Bus</label>
            <select value={formData.busId} onChange={(e) => setFormData({ ...formData, busId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required>
              <option value="">-- Select bus --</option>
              {buses.map(b => <option key={b.id} value={b.id}>{b.busNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Task</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notes (optional)</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Due Date</label>
            <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Record" message={`Delete maintenance record "${deleteTarget?.title}"?`} confirmLabel="Delete" />
    </div>
  );
};

export default Maintenance;
