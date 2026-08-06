import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface ParentUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isActive: number;
  _count?: { students: number };
  students?: Array<{ id: string; name: string; rollNumber: string }>;
}

const Parents: React.FC = () => {
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentUser | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const loadParents = async () => {
    try {
      const response = await api.get('/parents', { params: { limit: 100 } });
      setParents(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading parents:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadParents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingParent) {
        await api.put(`/parents/${editingParent.id}`, formData);
      } else {
        await api.post('/parents', formData);
      }
      setShowModal(false);
      setEditingParent(null);
      setFormData({ name: '', phone: '', email: '' });
      loadParents();
    } catch (error) {
      console.error('Error saving parent:', error);
    }
  };

  const handleEdit = (parent: ParentUser) => {
    setEditingParent(parent);
    setFormData({ name: parent.name, phone: parent.phone, email: parent.email || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this parent?')) return;
    try {
      await api.delete(`/parents/${id}`);
      loadParents();
    } catch (error) {
      console.error('Error deleting parent:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Parent Management</h1>
        <button
          onClick={() => { setEditingParent(null); setFormData({ name: '', phone: '', email: '' }); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Parent
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parents.map((parent) => (
              <tr key={parent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{parent.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parent.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parent.email || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {parent._count?.students || 0}
                  {(parent.students?.length || 0) > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {parent.students?.map((s) => s.name).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(parent)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(parent.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parents.length === 0 && (
          <div className="p-6 text-center text-gray-500">No parents found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingParent ? 'Edit Parent' : 'Add Parent'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <p className="text-xs text-gray-400">
                Note: parents must verify with this phone number to log in.
              </p>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parents;