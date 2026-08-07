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

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  isActive: boolean;
  bus?: { id: string; busNumber: string };
}

const DriverManagement: React.FC = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', licenseNumber: '', password: '' });

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = async () => {
    try { const res = await api.get('/drivers'); setDrivers(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load drivers'); }
    setIsLoading(false);
  };

  const filtered = drivers.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.licenseNumber.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDriver) {
        const updateData: any = { name: formData.name, phone: formData.phone, email: formData.email, licenseNumber: formData.licenseNumber };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/drivers/${editingDriver.id}`, updateData);
        toast('success', 'Driver updated');
      } else {
        await api.post('/drivers', formData);
        toast('success', 'Driver added');
      }
      closeModal(); loadDrivers();
    } catch { toast('error', 'Failed to save driver'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/drivers/${deleteTarget.id}`); toast('success', 'Driver deleted'); loadDrivers(); }
    catch { toast('error', 'Failed to delete driver'); }
    setDeleteTarget(null);
  };

  const handleGenerateActivation = async () => {
    try {
      const res = await api.post('/auth/generate-activation');
      const url = res.data?.data?.activationUrl;
      if (url) { setActivationUrl(url); navigator.clipboard.writeText(url); toast('success', 'Activation link copied!'); }
    } catch { toast('error', 'Failed to generate link'); }
  };

  const openAdd = () => { setEditingDriver(null); setFormData({ name: '', phone: '', email: '', licenseNumber: '', password: '' }); setShowModal(true); };
  const openEdit = (d: Driver) => { setEditingDriver(d); setFormData({ name: d.name, phone: d.phone, email: d.email || '', licenseNumber: d.licenseNumber, password: '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingDriver(null); };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Driver Management"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleGenerateActivation}>Generate Activation Link</Button>
            <Button size="sm" onClick={openAdd}>+ Add Driver</Button>
          </>
        }
      />

      {activationUrl && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between animate-slide-up">
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Activation link copied to clipboard!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 break-all">{activationUrl}</p>
          </div>
          <button onClick={() => setActivationUrl(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name, phone, or license..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
      />

      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {['Name', 'Phone', 'License', 'Bus', 'Status', 'Actions'].map(h => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((driver) => (
              <tr key={driver.id} className="table-row-hover">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{driver.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{driver.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{driver.licenseNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{driver.bus?.busNumber || 'Not assigned'}</td>
                <td className="px-6 py-4"><StatusBadge status={driver.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(driver)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mr-3">Edit</button>
                  <button onClick={() => setDeleteTarget(driver)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title={drivers.length === 0 ? 'No drivers yet' : 'No matches'} description={drivers.length === 0 ? 'Add your first driver to get started.' : 'Try a different search term.'} action={drivers.length === 0 ? <Button onClick={openAdd}>+ Add Driver</Button> : undefined} />}
      </div>

      {/* Mobile cards */}
      <div className="data-cards flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <EmptyState title={drivers.length === 0 ? 'No drivers yet' : 'No matches'} description={drivers.length === 0 ? 'Add your first driver to get started.' : 'Try a different search term.'} action={drivers.length === 0 ? <Button onClick={openAdd}>+ Add Driver</Button> : undefined} />
        ) : filtered.map((driver) => (
          <div key={driver.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 dark:text-white">{driver.name}</p>
              <StatusBadge status={driver.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{driver.phone} &middot; {driver.licenseNumber}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bus: {driver.bus?.busNumber || 'Not assigned'}</p>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => openEdit(driver)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</button>
              <button onClick={() => setDeleteTarget(driver)} className="text-sm text-red-600 dark:text-red-400 font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">Showing {filtered.length} of {drivers.length} drivers</p>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingDriver ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">License Number</label>
            <input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password {editingDriver ? '(leave blank to keep current)' : ''}</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" {...(!editingDriver ? { required: true } : {})} placeholder={editingDriver ? '••••••••' : 'Min 6 characters'} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Driver" message={`Delete driver ${deleteTarget?.name}? This cannot be undone.`} confirmLabel="Delete" />
    </div>
  );
};

export default DriverManagement;
