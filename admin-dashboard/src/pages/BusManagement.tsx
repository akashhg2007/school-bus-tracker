import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import { exportToCSV } from '../services/exportCSV';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

interface Bus {
  id: string;
  busNumber: string;
  plateNumber: string;
  capacity: number;
  isActive: boolean;
  driver?: { id: string; name: string } | null;
  route?: { id: string; name: string } | null;
  _count?: { students: number };
}

const BusManagement: React.FC = () => {
  const { toast } = useToast();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bus | null>(null);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; bus?: { id: string } | null }>>([]);
  const [routes, setRoutes] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({ busNumber: '', plateNumber: '', capacity: 40, driverId: '', routeId: '' });

  useEffect(() => { loadBuses(); loadOptions(); }, []);

  const loadBuses = async () => {
    try {
      const res = await api.get('/buses', { params: { limit: 100 } });
      setBuses(unwrapList(res.data));
    } catch { toast('error', 'Failed to load buses'); }
    setIsLoading(false);
  };

  const loadOptions = async () => {
    const [d, r] = await Promise.all([
      api.get('/drivers', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
      api.get('/routes', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
    ]);
    setDrivers(unwrapList(d.data));
    setRoutes(unwrapList(r.data));
  };

  const filtered = buses.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.busNumber.toLowerCase().includes(q) || b.plateNumber.toLowerCase().includes(q) ||
      b.driver?.name?.toLowerCase().includes(q) || b.route?.name?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { busNumber: formData.busNumber.trim(), plateNumber: formData.plateNumber.trim(), capacity: Number(formData.capacity) };
      if (formData.driverId) payload.driverId = formData.driverId;
      if (formData.routeId) payload.routeId = formData.routeId;

      if (editingBus) {
        await api.put(`/buses/${editingBus.id}`, payload);
        toast('success', 'Bus updated');
      } else {
        await api.post('/buses', payload);
        toast('success', 'Bus added');
      }
      closeModal();
      loadBuses();
    } catch { toast('error', 'Failed to save bus'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/buses/${deleteTarget.id}`); toast('success', 'Bus deactivated'); loadBuses(); }
    catch { toast('error', 'Failed to deactivate bus'); }
    setDeleteTarget(null);
  };

  const openAdd = () => { setEditingBus(null); setFormData({ busNumber: '', plateNumber: '', capacity: 40, driverId: '', routeId: '' }); setShowModal(true); };
  const openEdit = (bus: Bus) => { setEditingBus(bus); setFormData({ busNumber: bus.busNumber, plateNumber: bus.plateNumber, capacity: bus.capacity, driverId: bus.driver?.id || '', routeId: bus.route?.id || '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingBus(null); };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bus Management"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportToCSV(filtered.map(b => ({ 'Bus Number': b.busNumber, 'Plate Number': b.plateNumber, Capacity: b.capacity, Driver: b.driver?.name || 'Unassigned', Route: b.route?.name || 'No route', Students: b._count?.students || 0, Status: b.isActive ? 'Active' : 'Inactive' })), 'buses')}>Export CSV</Button>
            <Button size="sm" onClick={openAdd}>+ Add Bus</Button>
          </>
        }
      />

      <input
        type="text"
        placeholder="Search by bus number, plate, driver, or route..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
      />

      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {['Bus Number', 'Plate Number', 'Capacity', 'Driver', 'Route', 'Students', 'Status', 'Actions'].map(h => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((bus) => (
              <tr key={bus.id} className="table-row-hover">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{bus.busNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{bus.plateNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{bus.capacity}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{bus.driver?.name || 'Unassigned'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{bus.route?.name || 'No route'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{bus._count?.students ?? 0}</td>
                <td className="px-6 py-4"><StatusBadge status={bus.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(bus)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mr-3">Edit</button>
                  <button onClick={() => setDeleteTarget(bus)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title={buses.length === 0 ? 'No buses yet' : 'No matches'} description={buses.length === 0 ? 'Add your first bus to start tracking.' : 'Try a different search term.'} action={buses.length === 0 ? <Button onClick={openAdd}>+ Add Bus</Button> : undefined} />}
      </div>

      {/* Mobile cards */}
      <div className="data-cards flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <EmptyState title={buses.length === 0 ? 'No buses yet' : 'No matches'} description={buses.length === 0 ? 'Add your first bus to start tracking.' : 'Try a different search term.'} action={buses.length === 0 ? <Button onClick={openAdd}>+ Add Bus</Button> : undefined} />
        ) : filtered.map((bus) => (
          <div key={bus.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 dark:text-white">{bus.busNumber}</p>
              <StatusBadge status={bus.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{bus.plateNumber} &middot; {bus.capacity} seats</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{bus.driver?.name || 'Unassigned'} &middot; {bus.route?.name || 'No route'}</p>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => openEdit(bus)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</button>
              <button onClick={() => setDeleteTarget(bus)} className="text-sm text-red-600 dark:text-red-400 font-medium">Deactivate</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">Showing {filtered.length} of {buses.length} buses</p>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingBus ? 'Edit Bus' : 'Add New Bus'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Bus Number</label>
            <input type="text" value={formData.busNumber} onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Plate Number</label>
            <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Capacity</label>
            <input type="number" min={1} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Driver</label>
            <select value={formData.driverId} onChange={(e) => setFormData({ ...formData, driverId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
              <option value="">-- Unassigned --</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.bus?.id ? ' (assigned)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Route</label>
            <select value={formData.routeId} onChange={(e) => setFormData({ ...formData, routeId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
              <option value="">-- No route --</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Deactivate Bus" message={`Deactivate bus ${deleteTarget?.busNumber}? It will no longer appear in active listings.`} confirmLabel="Deactivate" />
    </div>
  );
};

export default BusManagement;
