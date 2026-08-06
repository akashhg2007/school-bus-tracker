import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    userId: '',
    userType: 'PARENT' as 'PARENT' | 'DRIVER' | 'ADMIN',
    title: '',
    body: '',
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data?.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
    setIsLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notifications/send', sendForm);
      setShowSendModal(false);
      setSendForm({ userId: '', userType: 'PARENT', title: '', body: '' });
      loadNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        <div className="space-x-2">
          <button onClick={handleMarkAllAsRead} className="text-blue-600 hover:text-blue-800">
            Mark all as read
          </button>
          <button onClick={() => setShowSendModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Send Notification
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start">
                  <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${!notification.isRead ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                  <div className="flex-1">
                    <h3 className="font-medium">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Send Notification</h2>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <input type="text" value={sendForm.userId} onChange={(e) => setSendForm({ ...sendForm, userId: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="UUID of user" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Type</label>
                <select value={sendForm.userType} onChange={(e) => setSendForm({ ...sendForm, userType: e.target.value as any })} className="w-full border rounded-lg px-3 py-2">
                  <option value="PARENT">Parent</option>
                  <option value="DRIVER">Driver</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea value={sendForm.body} onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} required />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowSendModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
