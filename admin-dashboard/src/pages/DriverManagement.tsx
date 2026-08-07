import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    licenseNumber: '',
    password: '',
  });
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        const updateData: any = { name: formData.name, phone: formData.phone, email: formData.email, licenseNumber: formData.licenseNumber };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/drivers/${editingDriver.id}`, updateData);
      } else {
        await api.post('/drivers', formData);
      }
      setShowModal(false);
      setEditingDriver(null);
      setFormData({ name: '', phone: '', email: '', licenseNumber: '', password: '' });
      loadDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || '',
      licenseNumber: driver.licenseNumber,
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      loadDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const handleGenerateActivation = async () => {
    try {
      const response = await api.post('/auth/generate-activation', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const url = response.data?.data?.activationUrl;
      if (url) {
        setActivationUrl(url);
        navigator.clipboard.writeText(url);
      }
    } catch (error) {
      console.error('Error generating activation link:', error);
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
        <h1 className="text-2xl font-bold text-gray-800">Driver Management</h1>
        <button
          onClick={() => { setEditingDriver(null); setFormData({ name: '', phone: '', email: '', licenseNumber: '', password: '' }); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Driver
        </button>
      </div>

      {activationUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Activation link copied to clipboard!</p>
            <p className="text-xs text-green-600 mt-1 break-all">{activationUrl}</p>
          </div>
          <button onClick={() => setActivationUrl(null)} className="text-green-600 hover:text-green-800 ml-4">✕</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td className="px-6 py-4 whitespace-nowrap">{driver.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{driver.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">{driver.licenseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">{driver.bus?.busNumber || 'Not assigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${driver.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {driver.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button onClick={() => handleEdit(driver)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => handleGenerateActivation()} className="text-green-600 hover:text-green-800">Activation</button>
                  <button onClick={() => handleDelete(driver.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {drivers.length === 0 && (
          <div className="p-6 text-center text-gray-500">No drivers found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingDriver ? 'Edit Driver' : 'Add Driver'}</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">License Number</label>
                <input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password {editingDriver ? '(leave blank to keep current)' : ''}
                </label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border rounded-lg px-3 py-2" {...(!editingDriver ? { required: true } : {})} placeholder={editingDriver ? '••••••••' : 'Min 6 characters'} />
              </div>
              <p className="text-xs text-gray-400">
                {editingDriver
                  ? 'Leave password blank to keep the current password.'
                  : 'Set a password for the driver to log in with email/phone + password.'}
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

export default DriverManagement;
