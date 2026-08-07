import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

interface Stop { id: string; name: string; latitude: number; longitude: number; order: number; }
interface Route { id: string; name: string; stops: Stop[]; _count?: { buses: number }; }

const RouteManagement: React.FC = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [stops, setStops] = useState<Array<{ name: string; latitude: number; longitude: number }>>([
    { name: '', latitude: 0, longitude: 0 },
    { name: '', latitude: 0, longitude: 0 },
  ]);

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    try { const res = await api.get('/routes'); setRoutes(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load routes'); }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRoute) {
        await api.put(`/routes/${editingRoute.id}`, { name: routeName });
        toast('success', 'Route updated');
      } else {
        await api.post('/routes', { name: routeName, stops });
        toast('success', 'Route created');
      }
      closeModal(); loadRoutes();
    } catch { toast('error', 'Failed to save route'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/routes/${deleteTarget.id}`); toast('success', 'Route deleted'); loadRoutes(); }
    catch { toast('error', 'Failed to delete route'); }
    setDeleteTarget(null);
  };

  const openAdd = () => { setEditingRoute(null); setRouteName(''); setStops([{ name: '', latitude: 0, longitude: 0 }, { name: '', latitude: 0, longitude: 0 }]); setShowModal(true); };
  const openEdit = (r: Route) => { setEditingRoute(r); setRouteName(r.name); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingRoute(null); };
  const addStop = () => setStops([...stops, { name: '', latitude: 0, longitude: 0 }]);
  const updateStop = (i: number, field: string, val: any) => { const n = [...stops]; (n[i] as any)[field] = field === 'name' ? val : parseFloat(val) || 0; setStops(n); };
  const removeStop = (i: number) => { if (stops.length > 2) setStops(stops.filter((_, idx) => idx !== i)); };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Route Management" actions={<Button size="sm" onClick={openAdd}>+ Add Route</Button>} />

      {routes.length === 0 ? (
        <EmptyState title="No routes yet" description="Create your first route to start assigning buses." icon="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" action={<Button onClick={openAdd}>+ Add Route</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route) => (
            <div key={route.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{route.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(route)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</button>
                  <button onClick={() => setDeleteTarget(route)} className="text-sm text-red-600 dark:text-red-400 font-medium">Delete</button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{route.stops?.length || 0} stops &middot; {route._count?.buses || 0} buses</p>
              <div className="space-y-1.5">
                {route.stops?.slice(0, 4).map((stop, idx) => (
                  <div key={stop.id} className="flex items-center text-sm">
                    <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">{idx + 1}</span>
                    <span className="text-gray-700 dark:text-gray-300 truncate">{stop.name}</span>
                  </div>
                ))}
                {(route.stops?.length || 0) > 4 && <p className="text-xs text-gray-400 dark:text-gray-500">+{(route.stops?.length || 0) - 4} more stops</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editingRoute ? 'Edit Route' : 'Add Route'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Route Name</label>
            <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          {!editingRoute && (
            <>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Stops (min 2)</label>
                <Button type="button" variant="ghost" size="sm" onClick={addStop}>+ Add Stop</Button>
              </div>
              {stops.map((stop, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-600 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Stop {i + 1}</span>
                    {stops.length > 2 && <button type="button" onClick={() => removeStop(i)} className="text-red-500 text-sm">Remove</button>}
                  </div>
                  <input type="text" placeholder="Stop name" value={stop.name} onChange={(e) => updateStop(i, 'name', e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Latitude" value={stop.latitude || ''} onChange={(e) => updateStop(i, 'latitude', e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" step="any" required />
                    <input type="number" placeholder="Longitude" value={stop.longitude || ''} onChange={(e) => updateStop(i, 'longitude', e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" step="any" required />
                  </div>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Route" message={`Delete route ${deleteTarget?.name}? Buses assigned to it will be unassigned.`} confirmLabel="Delete" />
    </div>
  );
};

export default RouteManagement;
