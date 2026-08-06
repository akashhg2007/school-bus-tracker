import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface MaintenanceRecord {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string | null;
  bus?: { id: string; busNumber: string };
}

interface BusOption {
  id: string;
  busNumber: string;
}

const Maintenance: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    busId: '',
    title: '',
    description: '',
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const loadRecords = async () => {
    try {
      const response = await api.get('/maintenance', { params: { limit: 100 } });
      setRecords(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading maintenance:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecords();
    api.get('/buses', { params: { limit: 100 } })
      .then((res) => setBuses(unwrapList(res.data)))
      .catch((error) => console.error('Error loading buses:', error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        busId: formData.busId,
        title: formData.title.trim(),
        dueDate: formData.dueDate,
      };
      if (formData.description.trim()) payload.description = formData.description.trim();
      await api.post('/maintenance', payload);
      setShowModal(false);
      setFormData({ busId: '', title: '', description: '', dueDate: new Date().toISOString().slice(0, 10) });
      loadRecords();
    } catch (error) {
      console.error('Error saving maintenance:', error);
    }
  };

  const updateStatus = async (id: string, status: 'PENDING' | 'COMPLETED') => {
    try {
      await api.put(`/maintenance/${id}/status`, { status });
      loadRecords();
    } catch (error) {
      console.error('Error updating maintenance:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this maintenance record?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      loadRecords();
    } catch (error) {
      console.error('Error deleting maintenance:', error);
    }
  };

  const isOverdue = (r: MaintenanceRecord) => r.status === 'PENDING' && new Date(r.dueDate) < new Date();

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
        <h1 className="text-2xl font-bold text-gray-800">Maintenance</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Schedule Maintenance
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.bus?.busNumber || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{record.description || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={isOverdue(record) ? 'text-red-600 font-medium' : ''}>
                    {new Date(record.dueDate).toLocaleDateString()}
                    {isOverdue(record) && ' (overdue)'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    record.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {record.status === 'PENDING' ? (
                    <button onClick={() => updateStatus(record.id, 'COMPLETED')} className="text-green-600 hover:text-green-900 mr-4">Mark Done</button>
                  ) : (
                    <button onClick={() => updateStatus(record.id, 'PENDING')} className="text-yellow-600 hover:text-yellow-900 mr-4">Reopen</button>
                  )}
                  <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="p-6 text-center text-gray-500">No maintenance records found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Maintenance</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bus</label>
                <select value={formData.busId} onChange={(e) => setFormData({ ...formData, busId: e.target.value })} className="w-full border rounded-lg px-3 py-2" required>
                  <option value="">-- Select bus --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>{b.busNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Task</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
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

export default Maintenance;