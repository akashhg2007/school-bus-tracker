import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

interface Announcement { id: string; title: string; body: string; createdAt: string; }

const Announcements: React.FC = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const loadAnnouncements = async () => {
    try { const res = await api.get('/announcements', { params: { limit: 100 } }); setAnnouncements(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load announcements'); }
    setIsLoading(false);
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/announcements', { title: title.trim(), body: body.trim() });
      toast('success', 'Announcement published');
      setShowModal(false); setTitle(''); setBody(''); loadAnnouncements();
    } catch { toast('error', 'Failed to publish announcement'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/announcements/${deleteTarget.id}`); toast('success', 'Announcement deleted'); loadAnnouncements(); }
    catch { toast('error', 'Failed to delete announcement'); }
    setDeleteTarget(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Announcements" actions={<Button size="sm" onClick={() => setShowModal(true)}>+ New Announcement</Button>} />

      {announcements.length === 0 ? (
        <EmptyState title="No announcements" description="Create announcements to notify parents and drivers." icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" action={<Button onClick={() => setShowModal(true)}>+ New Announcement</Button>} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {announcements.map((a) => (
            <div key={a.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.body}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDate(a.createdAt)}</p>
                </div>
                <button onClick={() => setDeleteTarget(a)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm ml-4 flex-shrink-0">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" rows={4} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Publish</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Announcement" message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmLabel="Delete" />
    </div>
  );
};

export default Announcements;
