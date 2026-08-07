import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { unwrapList } from '../services/api';

// Fix for default marker icon
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

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');

const LiveTracking: React.FC = () => {
  const [buses, setBuses] = useState<Record<string, BusLocation>>({});
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyAlert, setEmergencyAlert] = useState<{ message: string; busNumber?: string; studentName?: string; timestamp: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

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
          map[b.id] = {
            id: b.id,
            busNumber: b.busNumber,
            plateNumber: b.plateNumber,
            driverName: b.driver?.name || 'Not assigned',
            status: 'NOT_STARTED',
            lat: null,
            lng: null,
            speed: 0,
            heading: 0,
          };
        }
        for (const f of fleetList) {
          const existing = map[f.busId] || {
            id: f.busId,
            busNumber: f.busNumber || 'Unknown',
            plateNumber: f.plateNumber || '',
            driverName: f.driverName || 'Not assigned',
            status: 'NOT_STARTED',
            lat: null,
            lng: null,
            speed: 0,
            heading: 0,
          };
          map[f.busId] = {
            ...existing,
            lat: f.latitude,
            lng: f.longitude,
            speed: f.speed || 0,
            heading: f.heading || 0,
            tripId: f.tripId,
            updatedAt: f.createdAt,
            status: 'ON_ROUTE',
          };
        }

        setBuses(map);
      } catch (error) {
        console.error('Error loading live tracking:', error);
      }
      setIsLoading(false);
    };

    load();

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (user.schoolId) socket.emit('join:school', user.schoolId);
        });

        socket.on('fleet:location-update', (data: FleetUpdate) => {
          if (!data?.busId || data.latitude === undefined || data.longitude === undefined) return;
          setBuses((prev) => {
            const existing = prev[data.busId];
            return {
              ...prev,
              [data.busId]: {
                id: data.busId,
                busNumber: data.busNumber || existing?.busNumber || 'Unknown',
                plateNumber: data.plateNumber || existing?.plateNumber || '',
                driverName: data.driverName || existing?.driverName || 'Not assigned',
                status: 'ON_ROUTE',
                lat: data.latitude,
                lng: data.longitude,
                speed: data.speed || 0,
                heading: data.heading || 0,
                tripId: data.tripId,
                updatedAt: data.createdAt,
              },
            };
          });
        });

        socket.on('trip:started', (data: { tripId: string; busId: string; busNumber: string }) => {
          if (!data?.busId) return;
          setBuses((prev) => ({
            ...prev,
            [data.busId]: {
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
            return {
              ...prev,
              [data.busId]: { ...existing, tripId: undefined, lat: null, lng: null, speed: 0, status: 'NOT_STARTED' },
            };
          });
        });

        socket.on('fleet:emergency-alert', (data: { message: string; busNumber?: string; studentName?: string; tripId?: string; busId?: string; timestamp?: string }) => {
          setEmergencyAlert({
            message: data.message || 'Emergency alert received',
            busNumber: data.busNumber,
            studentName: data.studentName,
            timestamp: data.timestamp || new Date().toISOString(),
          });
          if (data.busId) {
            setBuses((prev) => {
              const existing = prev[data.busId!];
              if (!existing) return prev;
              return { ...prev, [data.busId!]: { ...existing, status: 'ON_ROUTE' } };
            });
          }
          setTimeout(() => setEmergencyAlert(null), 15000);
        });
      } catch (error) {
        console.error('Error connecting socket:', error);
      }
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const getBusStatusText = (bus: BusLocation) => (bus.status === 'ON_ROUTE' ? 'On Route' : 'Not Started');

  const createBusIcon = (status: string) => {
    const color = status === 'ON_ROUTE' ? '#22c55e' : '#9ca3af';
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`,
      className: 'custom-bus-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allBuses = Object.values(buses);

  return (
    <div className="space-y-6">
      {emergencyAlert && (
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-bold text-lg">EMERGENCY ALERT</p>
              <p className="text-sm">{emergencyAlert.message}{emergencyAlert.busNumber ? ` — Bus ${emergencyAlert.busNumber}` : ''}{emergencyAlert.studentName ? ` (${emergencyAlert.studentName})` : ''}</p>
            </div>
          </div>
          <button onClick={() => setEmergencyAlert(null)} className="text-white hover:text-red-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Live Bus Tracking</h1>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-600">On Route</span>
          <span className="w-3 h-3 bg-gray-400 rounded-full ml-4"></span>
          <span className="text-sm text-gray-600">Not Started</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {allBuses
              .filter((b) => b.lat !== null && b.lng !== null)
              .map((bus) => (
                <Marker
                  key={bus.id}
                  position={[bus.lat as number, bus.lng as number]}
                  icon={createBusIcon(bus.status)}
                  eventHandlers={{
                    click: () => setSelectedBus(bus),
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{bus.busNumber}</h3>
                      <p className="text-sm text-gray-600">{bus.driverName}</p>
                      <p className="text-sm text-gray-600">Speed: {bus.speed} km/h</p>
                      <p className="text-sm text-gray-600">Updated: {bus.updatedAt ? new Date(bus.updatedAt).toLocaleTimeString() : '—'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        {/* Bus List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">All Buses</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[460px] overflow-y-auto">
            {allBuses.length === 0 && (
              <div className="p-6 text-center text-gray-500">No buses found</div>
            )}
            {allBuses.map((bus) => (
              <div
                key={bus.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedBus?.id === bus.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedBus(bus)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      bus.status === 'ON_ROUTE' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h3 className="font-medium text-gray-800">{bus.busNumber}</h3>
                      <p className="text-sm text-gray-500">{bus.driverName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      bus.status === 'ON_ROUTE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getBusStatusText(bus)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{bus.speed} km/h</p>
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