import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { unwrapList } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BusLocation {
  id: string;
  busNumber: string;
  plateNumber: string;
  driverName: string;
  status: 'ON_ROUTE' | 'NOT_STARTED';
  lat: number | null;
  lng: number | null;
  speed: number;
  heading: number;
  tripId?: string;
  updatedAt?: string;
}

interface FleetUpdate {
  busId: string;
  busNumber?: string;
  plateNumber?: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  tripId?: string;
  createdAt?: string;
}

const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');

const FollowBus: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { duration: 1 });
  }, [position, map]);
  return null;
};

const LiveTracking: React.FC = () => {
  const { toast } = useToast();
  const [buses, setBuses] = useState<Record<string, BusLocation>>({});
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [followBusId, setFollowBusId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyAlert, setEmergencyAlert] = useState<{ message: string; busNumber?: string; studentName?: string; timestamp: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  useEffect(() => {
    let socket: Socket | null = null;

    const load = async () => {
      try {
        const [busesRes, fleetRes, meRes] = await Promise.all([
          api.get('/buses', { params: { limit: 100 } }),
          api.get('/location/fleet'),
          api.get('/auth/me').catch(() => null),
        ]);

        const busList: any[] = unwrapList(busesRes.data).filter((b: any) => b.isActive);
        const fleetList: any[] = unwrapList(fleetRes.data) || [];
        const user = meRes?.data?.data;

        const map: Record<string, BusLocation> = {};
        for (const b of busList) {
          map[b.id] = {
            id: b.id, busNumber: b.busNumber, plateNumber: b.plateNumber,
            driverName: b.driver?.name || 'Not assigned', status: 'NOT_STARTED',
            lat: null, lng: null, speed: 0, heading: 0,
          };
        }
        for (const f of fleetList) {
          const existing = map[f.busId] || {
            id: f.busId, busNumber: f.busNumber || 'Unknown', plateNumber: f.plateNumber || '',
            driverName: f.driverName || 'Not assigned', status: 'NOT_STARTED' as const,
            lat: null, lng: null, speed: 0, heading: 0,
          };
          map[f.busId] = {
            ...existing, lat: f.latitude, lng: f.longitude, speed: f.speed || 0,
            heading: f.heading || 0, tripId: f.tripId, updatedAt: f.createdAt, status: 'ON_ROUTE',
          };
        }
        setBuses(map);

        if (user) {
          try {
            socket = io(SOCKET_URL, {
              withCredentials: true,
              transports: ['websocket', 'polling'],
              reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000, reconnectionDelayMax: 30000,
            });
            socketRef.current = socket;

            socket.on('connect', () => { if (user.schoolId) socket!.emit('join:school', user.schoolId); });

            socket.on('fleet:location-update', (data: FleetUpdate) => {
              if (!data?.busId || data.latitude === undefined || data.longitude === undefined) return;
              setBuses((prev) => {
                const existing = prev[data.busId];
                return {
                  ...prev, [data.busId]: {
                    id: data.busId, busNumber: data.busNumber || existing?.busNumber || 'Unknown',
                    plateNumber: data.plateNumber || existing?.plateNumber || '',
                    driverName: data.driverName || existing?.driverName || 'Not assigned',
                    status: 'ON_ROUTE', lat: data.latitude, lng: data.longitude,
                    speed: data.speed || 0, heading: data.heading || 0,
                    tripId: data.tripId, updatedAt: data.createdAt,
                  },
                };
              });
            });

            socket.on('trip:started', (data: { tripId: string; busId: string; busNumber: string }) => {
              if (!data?.busId) return;
              setBuses((prev) => ({
                ...prev, [data.busId]: {
                  ...(prev[data.busId] || { id: data.busId, busNumber: data.busNumber || 'Unknown', plateNumber: '', driverName: 'Not assigned', lat: null, lng: null, speed: 0, heading: 0 }),
                  tripId: data.tripId,
                },
              }));
            });

            socket.on('trip:ended', (data: { busId: string }) => {
              if (!data?.busId) return;
              setBuses((prev) => {
                const existing = prev[data.busId];
                if (!existing) return prev;
                return { ...prev, [data.busId]: { ...existing, tripId: undefined, lat: null, lng: null, speed: 0, status: 'NOT_STARTED' } };
              });
            });

            socket.on('fleet:emergency-alert', (data: { message: string; busNumber?: string; studentName?: string; tripId?: string; busId?: string; timestamp?: string }) => {
              setEmergencyAlert({
                message: data.message || 'Emergency alert received',
                busNumber: data.busNumber, studentName: data.studentName,
                timestamp: data.timestamp || new Date().toISOString(),
              });
              toast('error', `EMERGENCY: ${data.message}`);
            });
          } catch { /* socket connection error */ }
        }
      } catch { toast('error', 'Failed to load tracking data'); }
      setIsLoading(false);
    };

    load();

    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const dismissAlert = () => { if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current); setEmergencyAlert(null); };

  const createBusIcon = (status: string) => {
    const color = status === 'ON_ROUTE' ? '#22c55e' : '#9ca3af';
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`,
      className: 'custom-bus-icon', iconSize: [40, 40], iconAnchor: [20, 20],
    });
  };

  const handleRefresh = () => {
    setIsLoading(true);
    const load = async () => {
      try {
        const [busesRes, fleetRes] = await Promise.all([
          api.get('/buses', { params: { limit: 100 } }),
          api.get('/location/fleet'),
        ]);
        const busList: any[] = unwrapList(busesRes.data).filter((b: any) => b.isActive);
        const fleetList: any[] = unwrapList(fleetRes.data) || [];
        const map: Record<string, BusLocation> = {};
        for (const b of busList) {
          map[b.id] = { id: b.id, busNumber: b.busNumber, plateNumber: b.plateNumber, driverName: b.driver?.name || 'Not assigned', status: 'NOT_STARTED', lat: null, lng: null, speed: 0, heading: 0 };
        }
        for (const f of fleetList) {
          const existing = map[f.busId];
          if (existing) {
            map[f.busId] = { ...existing, lat: f.latitude, lng: f.longitude, speed: f.speed || 0, heading: f.heading || 0, tripId: f.tripId, updatedAt: f.createdAt, status: 'ON_ROUTE' };
          }
        }
        setBuses(map);
      } catch { toast('error', 'Failed to refresh'); }
      setIsLoading(false);
    };
    load();
  };

  if (isLoading) return <LoadingSkeleton />;

  const allBuses = Object.values(buses);
  const trackedBuses = allBuses.filter((b) => b.lat !== null && b.lng !== null);
  const followPosition = followBusId && buses[followBusId]?.lat && buses[followBusId]?.lng
    ? [buses[followBusId].lat!, buses[followBusId].lng!] as [number, number]
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Emergency alert */}
      {emergencyAlert && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring"></span>
            </div>
            <div>
              <p className="font-bold">EMERGENCY ALERT</p>
              <p className="text-sm text-red-100">{emergencyAlert.message}{emergencyAlert.busNumber ? ` — Bus ${emergencyAlert.busNumber}` : ''}{emergencyAlert.studentName ? ` (${emergencyAlert.studentName})` : ''}</p>
              <p className="text-xs text-red-200 mt-0.5">{new Date(emergencyAlert.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={dismissAlert} className="text-white hover:text-red-200 flex-shrink-0 ml-4 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <PageHeader
        title="Live Bus Tracking"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              <span className="text-gray-500 dark:text-gray-400">On Route ({trackedBuses.length})</span>
              <span className="w-2.5 h-2.5 bg-gray-400 rounded-full ml-2"></span>
              <span className="text-gray-500 dark:text-gray-400">Idle ({allBuses.length - trackedBuses.length})</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRefresh}>Refresh</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <MapContainer center={defaultCenter} zoom={13} style={{ height: '520px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {followPosition && <FollowBus position={followPosition} />}
            {trackedBuses.map((bus) => (
              <Marker
                key={bus.id}
                position={[bus.lat as number, bus.lng as number]}
                icon={createBusIcon(bus.status)}
                eventHandlers={{ click: () => { setSelectedBus(bus); setFollowBusId(bus.id); } }}
              >
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-sm">{bus.busNumber}</h3>
                    <p className="text-xs text-gray-600">{bus.driverName}</p>
                    <p className="text-xs text-gray-600">Speed: {bus.speed} km/h</p>
                    <p className="text-xs text-gray-500">{bus.updatedAt ? new Date(bus.updatedAt).toLocaleTimeString() : '—'}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Bus list */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white">All Buses</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[480px] overflow-y-auto">
            {allBuses.length === 0 ? (
              <EmptyState title="No buses found" description="Add buses to see them here." />
            ) : allBuses.map((bus) => (
              <div
                key={bus.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  selectedBus?.id === bus.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => { setSelectedBus(bus); if (bus.lat && bus.lng) setFollowBusId(bus.id); }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${bus.status === 'ON_ROUTE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-medium text-sm text-gray-800 dark:text-white">{bus.busNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{bus.driverName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={bus.status} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{bus.speed} km/h</p>
                    {bus.updatedAt && <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(bus.updatedAt).toLocaleTimeString()}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
