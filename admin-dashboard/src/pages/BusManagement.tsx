import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';

interface Bus {
  id: string;
  busNumber: string;
  plateNumber: string;
  capacity: number;
  isActive: number;
  driver?: { id: string; name: string } | null;
  route?: { id: string; name: string } | null;
  _count?: { students: number };
}

interface DriverOption {
  id: string;
  name: string;
  bus?: { id: string } | null;
}

interface RouteOption {
  id: string;
  name: string;
}

const BusManagement: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [formData, setFormData] = useState({
    busNumber: '',
    plateNumber: '',
    capacity: 40,
    driverId: '',
    routeId: '',
  });

  const loadBuses = async () => {
    try {
      const response = await api.get('/buses', { params: { limit: 100 } });
      setBuses(unwrapList(response.data));
    } catch (error) {
      console.error('Error loading buses:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBuses();
    api.get('/drivers', { params: { limit: 100 } }).then((res) => {
      setDrivers(unwrapList(res.data));
    }).catch((error) => console.error('Error loading drivers:', error));
    api.get('/routes', { params: { limit: 100 } }).then((res) => {
      setRoutes(unwrapList(res.data));
    }).catch((error) => console.error('Error loading routes:', error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        busNumber: formData.busNumber.trim(),
        plateNumber: formData.plateNumber.trim(),
        capacity: Number(formData.capacity),
      };
      if (formData.driverId) payload.driverId = formData.driverId;
      if (formData.routeId) payload.routeId = formData.routeId;

      if (editingBus) {
        await api.put(`/buses/${editingBus.id}`, payload);
      } else {
        await api.post('/buses', payload);
      }
      setShowModal(false);
      setEditingBus(null);
      setFormData({ busNumber: '', plateNumber: '', capacity: 40, driverId: '', routeId: '' });
      loadBuses();
    } catch (error) {
      console.error('Error saving bus:', error);
      alert('Failed to save bus. Check for duplicate numbers or an already-assigned driver.');
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      capacity: bus.capacity,
      driverId: bus.driver?.id || '',
      routeId: bus.route?.id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this bus?')) return;
    try {
      await api.delete(`/buses/${id}`);
      loadBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
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
        <h1 className="text-2xl font-bold text-gray-800">Bus Management</h1>
        <button
          onClick={() => { setEditingBus(null); setFormData({ busNumber: '', plateNumber: '', capacity: 40, driverId: '', routeId: '' }); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Bus
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {buses.map((bus) => (
              <tr key={bus.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{bus.busNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{bus.plateNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{bus.capacity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{bus.driver?.name || 'Unassigned'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{bus.route?.name || 'No route'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{bus._count?.students ?? 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bus.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {bus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(bus)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(bus.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {buses.length === 0 && (
          <div className="p-6 text-center text-gray-500">No buses found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingBus ? 'Edit Bus' : 'Add New Bus'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bus Number</label>
                <input type="text" value={formData.busNumber} onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input type="number" min={1} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver</label>
                <select value={formData.driverId} onChange={(e) => setFormData({ ...formData, driverId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- Unassigned --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.bus?.id ? ' (assigned)' : ''}</option>
                  ))}
                </select>
                {drivers.length === 0 && <p className="text-xs text-gray-400 mt-1">No drivers yet — add a driver first.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Route</label>
                <select value={formData.routeId} onChange={(e) => setFormData({ ...formData, routeId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- No route --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusManagement;