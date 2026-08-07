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

interface ParentUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
  _count?: { students: number };
  students?: Array<{ id: string; name: string; rollNumber: string }>;
}

const Parents: React.FC = () => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParentUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });

  useEffect(() => { loadParents(); }, []);

  const loadParents = async () => {
    try { const res = await api.get('/parents', { params: { limit: 100 } }); setParents(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load parents'); }
    setIsLoading(false);
  };

  const filtered = parents.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.email?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingParent) {
        const updateData: any = { name: formData.name, phone: formData.phone, email: formData.email };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/parents/${editingParent.id}`, updateData);
        toast('success', 'Parent updated');
      } else {
        await api.post('/parents', formData);
        toast('success', 'Parent added');
      }
      closeModal(); loadParents();
    } catch { toast('error', 'Failed to save parent'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/parents/${deleteTarget.id}`); toast('success', 'Parent deactivated'); loadParents(); }
    catch { toast('error', 'Failed to deactivate parent'); }
    setDeleteTarget(null);
  };

  const handleGenerateActivation = async () => {
    try {
      const res = await api.post('/auth/generate-activation');
      const url = res.data?.data?.activationUrl;
      if (url) { setActivationUrl(url); navigator.clipboard.writeText(url); toast('success', 'Activation link copied!'); }
    } catch { toast('error', 'Failed to generate link'); }
  };

  const openAdd = () => { setEditingParent(null); setFormData({ name: '', phone: '', email: '', password: '' }); setShowModal(true); };
  const openEdit = (p: ParentUser) => { setEditingParent(p); setFormData({ name: p.name, phone: p.phone, email: p.email || '', password: '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingParent(null); };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parent Management"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleGenerateActivation}>Generate Activation Link</Button>
            <Button size="sm" onClick={openAdd}>+ Add Parent</Button>
          </>
        }
      />

      {activationUrl && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between animate-slide-up">
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Activation link copied to clipboard!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 break-all">{activationUrl}</p>
          </div>
          <button onClick={() => setActivationUrl(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
      />

      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {['Name', 'Phone', 'Email', 'Students', 'Status', 'Actions'].map(h => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((parent) => (
              <tr key={parent.id} className="table-row-hover">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{parent.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{parent.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{parent.email || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {parent._count?.students || 0}
                  {(parent.students?.length || 0) > 0 && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{parent.students?.map(s => s.name).join(', ')}</div>}
                </td>
                <td className="px-6 py-4"><StatusBadge status={parent.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(parent)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mr-3">Edit</button>
                  <button onClick={() => setDeleteTarget(parent)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title={parents.length === 0 ? 'No parents yet' : 'No matches'} description={parents.length === 0 ? 'Add your first parent to get started.' : 'Try a different search term.'} action={parents.length === 0 ? <Button onClick={openAdd}>+ Add Parent</Button> : undefined} />}
      </div>

      {/* Mobile cards */}
      <div className="data-cards flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <EmptyState title={parents.length === 0 ? 'No parents yet' : 'No matches'} description={parents.length === 0 ? 'Add your first parent to get started.' : 'Try a different search term.'} action={parents.length === 0 ? <Button onClick={openAdd}>+ Add Parent</Button> : undefined} />
        ) : filtered.map((parent) => (
          <div key={parent.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 dark:text-white">{parent.name}</p>
              <StatusBadge status={parent.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{parent.phone} &middot; {parent.email || 'No email'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{parent._count?.students || 0} student(s)</p>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => openEdit(parent)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</button>
              <button onClick={() => setDeleteTarget(parent)} className="text-sm text-red-600 dark:text-red-400 font-medium">Deactivate</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">Showing {filtered.length} of {parents.length} parents</p>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingParent ? 'Edit Parent' : 'Add Parent'}>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password {editingParent ? '(leave blank to keep current)' : ''}</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" {...(!editingParent ? { required: true } : {})} placeholder={editingParent ? '••••••••' : 'Min 6 characters'} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Deactivate Parent" message={`Deactivate parent ${deleteTarget?.name}? They won't be able to log in.`} confirmLabel="Deactivate" />
    </div>
  );
};

export default Parents;
