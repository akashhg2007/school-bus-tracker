import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const loadAnnouncements = async () => {
    try {
      const response = await api.get('/announcements', { params: { limit: 100 } });
      setAnnouncements(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements', { title: title.trim(), body: body.trim() });
      setShowModal(false);
      setTitle('');
      setBody('');
      loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString();

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
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Announcement
        </button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {announcements.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No announcements yet</div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{announcement.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(announcement.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(announcement.id)} className="text-red-600 hover:text-red-900 text-sm ml-4">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border rounded-lg px-3 py-2" rows={4} required />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;