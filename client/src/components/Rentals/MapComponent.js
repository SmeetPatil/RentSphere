import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapComponent = ({ 
  latitude, 
  longitude, 
  title = "Rental Location", 
  height = "200px",
  showControls = false,
  className = ""
}) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Check if coordinates are valid
  if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) {
    return (
      <div 
        className={`map-container error ${className}`}
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>📍</div>
          <div style={{ fontSize: '14px' }}>Location unavailable</div>
        </div>
      </div>
    );
  }

  const position = [lat, lng];

  return (
    <div className={`map-container ${className}`} style={{ position: 'relative' }}>
      <div 
        style={{ 
          height, 
          width: '100%',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={showControls}
          scrollWheelZoom={showControls}
          dragging={showControls}
          touchZoom={showControls}
          doubleClickZoom={showControls}
          boxZoom={showControls}
          keyboard={showControls}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={redIcon}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>{title}</strong><br />
                <small>{lat.toFixed(4)}, {lng.toFixed(4)}</small>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      
      {showControls && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          📍 {title}
        </div>
      )}
    </div>
  );
};

export default MapComponent;