import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  lat: number;
  lng: number;
  driverName: string;
  status: string;
  speed: number;
  heading: number;
}

const LiveTracking: React.FC = () => {
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Default center (Bangalore)
  const defaultCenter: [number, number] = [12.9716, 77.5946];

  useEffect(() => {
    // Simulate fetching bus locations
    const mockBuses: BusLocation[] = [
      { id: '1', busNumber: 'BUS-001', lat: 12.9716, lng: 77.5946, driverName: 'Ramesh Kumar', status: 'ON_ROUTE', speed: 25, heading: 90 },
      { id: '2', busNumber: 'BUS-002', lat: 12.9750, lng: 77.5980, driverName: 'Suresh Pal', status: 'DELAYED', speed: 15, heading: 180 },
      { id: '3', busNumber: 'BUS-003', lat: 12.9780, lng: 77.6010, driverName: 'Not Assigned', status: 'NOT_STARTED', speed: 0, heading: 0 },
    ];

    setBuses(mockBuses);
    setIsLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_ROUTE':
        return 'bg-green-100 text-green-800';
      case 'DELAYED':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const createBusIcon = (status: string) => {
    const color = status === 'ON_ROUTE' ? '#22c55e' : status === 'DELAYED' ? '#eab308' : '#9ca3af';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Live Bus Tracking</h1>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-600">On Route</span>
          <span className="w-3 h-3 bg-yellow-500 rounded-full ml-4"></span>
          <span className="text-sm text-gray-600">Delayed</span>
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
            {buses.map((bus) => (
              <Marker
                key={bus.id}
                position={[bus.lat, bus.lng]}
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
            {buses.map((bus) => (
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
                      bus.status === 'ON_ROUTE' ? 'bg-green-500' :
                      bus.status === 'DELAYED' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h3 className="font-medium text-gray-800">{bus.busNumber}</h3>
                      <p className="text-sm text-gray-500">{bus.driverName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bus.status)}`}>
                      {bus.status === 'ON_ROUTE' ? 'On Route' :
                       bus.status === 'DELAYED' ? 'Delayed' : 'Not Started'}
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
