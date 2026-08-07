import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useToast } from '../components/ui/Toast';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendForm, setSendForm] = useState({ userId: '', userType: 'PARENT' as 'PARENT' | 'DRIVER' | 'ADMIN', title: '', body: '' });

  const loadNotifications = async () => {
    try { const res = await api.get('/notifications'); setNotifications(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load notifications'); }
    setIsLoading(false);
  };

  useEffect(() => { loadNotifications(); }, []);

  const handleMarkAsRead = async (id: string) => {
    try { await api.put(`/notifications/${id}/read`); setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n)); }
    catch { toast('error', 'Failed to mark as read'); }
  };

  const handleMarkAllAsRead = async () => {
    try { await api.put('/notifications/read-all'); setNotifications(notifications.map(n => ({ ...n, isRead: true }))); toast('success', 'All marked as read'); }
    catch { toast('error', 'Failed to mark all as read'); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/notifications/send', sendForm);
      toast('success', 'Notification sent');
      setShowSendModal(false); setSendForm({ userId: '', userType: 'PARENT', title: '', body: '' }); loadNotifications();
    } catch { toast('error', 'Failed to send notification'); }
    setSaving(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>}
            <Button size="sm" onClick={() => setShowSendModal(true)}>+ Send Notification</Button>
          </div>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Notifications you send and receive will appear here." icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" action={<Button onClick={() => setShowSendModal(true)}>+ Send Notification</Button>} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm ${!n.isRead ? 'font-semibold text-gray-800 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>{n.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)} title="Send Notification">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">User ID</label>
            <input type="text" value={sendForm.userId} onChange={(e) => setSendForm({ ...sendForm, userId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" placeholder="UUID of user" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">User Type</label>
            <select value={sendForm.userType} onChange={(e) => setSendForm({ ...sendForm, userType: e.target.value as any })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
              <option value="PARENT">Parent</option>
              <option value="DRIVER">Driver</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Title</label>
            <input type="text" value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Message</label>
            <textarea value={sendForm.body} onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" rows={3} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowSendModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Send</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Notifications;
