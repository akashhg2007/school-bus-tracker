import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface Route {
  id: string;
  name: string;
  stops: Stop[];
  _count?: { buses: number };
}

const RouteManagement: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState('');
  const [stops, setStops] = useState<Array<{ name: string; latitude: number; longitude: number }>>([
    { name: '', latitude: 0, longitude: 0 },
    { name: '', latitude: 0, longitude: 0 },
  ]);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data?.data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoute) {
        await api.put(`/routes/${editingRoute.id}`, { name: routeName });
      } else {
        await api.post('/routes', { name: routeName, stops });
      }
      setShowModal(false);
      setEditingRoute(null);
      setRouteName('');
      setStops([{ name: '', latitude: 0, longitude: 0 }, { name: '', latitude: 0, longitude: 0 }]);
      loadRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setRouteName(route.name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      await api.delete(`/routes/${id}`);
      loadRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
    }
  };

  const addStop = () => {
    setStops([...stops, { name: '', latitude: 0, longitude: 0 }]);
  };

  const updateStop = (index: number, field: string, value: any) => {
    const newStops = [...stops];
    (newStops[index] as any)[field] = field === 'name' ? value : parseFloat(value) || 0;
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops(stops.filter((_, i) => i !== index));
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
        <h1 className="text-2xl font-bold text-gray-800">Route Management</h1>
        <button
          onClick={() => { setEditingRoute(null); setRouteName(''); setStops([{ name: '', latitude: 0, longitude: 0 }, { name: '', latitude: 0, longitude: 0 }]); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Route
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{route.name}</h3>
              <div className="space-x-2">
                <button onClick={() => handleEdit(route)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                <button onClick={() => handleDelete(route.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              {route.stops?.length || 0} stops | {route._count?.buses || 0} buses
            </div>
            <div className="space-y-1">
              {route.stops?.slice(0, 4).map((stop, idx) => (
                <div key={stop.id} className="flex items-center text-sm">
                  <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs mr-2">
                    {idx + 1}
                  </span>
                  {stop.name}
                </div>
              ))}
              {(route.stops?.length || 0) > 4 && (
                <div className="text-xs text-gray-400">+{(route.stops?.length || 0) - 4} more stops</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {routes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No routes found. Create your first route!
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingRoute ? 'Edit Route' : 'Add Route'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Route Name</label>
                <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
              </div>

              {!editingRoute && (
                <>
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Stops (min 2)</label>
                    <button type="button" onClick={addStop} className="text-blue-600 text-sm">+ Add Stop</button>
                  </div>
                  {stops.map((stop, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Stop {index + 1}</span>
                        {stops.length > 2 && (
                          <button type="button" onClick={() => removeStop(index)} className="text-red-500 text-sm">Remove</button>
                        )}
                      </div>
                      <input type="text" placeholder="Stop name" value={stop.name} onChange={(e) => updateStop(index, 'name', e.target.value)} className="w-full border rounded px-3 py-1 text-sm" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Latitude" value={stop.latitude || ''} onChange={(e) => updateStop(index, 'latitude', e.target.value)} className="border rounded px-3 py-1 text-sm" step="any" required />
                        <input type="number" placeholder="Longitude" value={stop.longitude || ''} onChange={(e) => updateStop(index, 'longitude', e.target.value)} className="border rounded px-3 py-1 text-sm" step="any" required />
                      </div>
                    </div>
                  ))}
                </>
              )}

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

export default RouteManagement;
