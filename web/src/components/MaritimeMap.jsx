import React, { useState } from 'react';
import { 
  Navigation, 
  Anchor, 
  Zap, 
  Phone
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const fishingIcon = new L.DivIcon({
  html: `<div style="background-color: #0ea5e9; border: 2px solid #ffffff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const collectorIcon = new L.DivIcon({
  html: `<div style="background-color: #f59e0b; border: 2px solid #ffffff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function MaritimeMap({ vessels, posts, orders }) {
  const [selectedVessel, setSelectedVessel] = useState(vessels[0] || null);
  const [targetVesselForRoute, setTargetVesselForRoute] = useState(vessels.length > 1 ? vessels[1] : (vessels[0] || null));
  const [filterType, setFilterType] = useState('ALL');

  const filteredVessels = vessels.filter(v => {
    if (filterType === 'FISHING') return v.type === 'fishing';
    if (filterType === 'COLLECTOR') return v.type === 'collector';
    return true;
  });

  const calculateDistanceNM = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const currentDistanceNM = (selectedVessel && targetVesselForRoute)
    ? calculateDistanceNM(
        selectedVessel.lat, selectedVessel.lng,
        targetVesselForRoute.lat, targetVesselForRoute.lng
      )
    : "0.0";

  // ETA tính từ khoảng cách thật / tốc độ trung bình 2 tàu (trước đây là chuỗi tĩnh "~18 Phút")
  const closingSpeedKnots = (selectedVessel && targetVesselForRoute)
    ? ((selectedVessel.speedKnots || 0) + (targetVesselForRoute.speedKnots || 0)) / 2
    : 0;
  const etaLabel = closingSpeedKnots > 0
    ? `~${Math.max(1, Math.round((parseFloat(currentDistanceNM) / closingSpeedKnots) * 60))} Phút`
    : 'Không xác định';

  const otherVessels = selectedVessel ? vessels.filter(v => v.id !== selectedVessel.id) : vessels;

  return (
    <div className="page-section">

      <div className="page-header">
        <h2 className="page-header-title">Bản Đồ Hải Trình & Chỉ Đường GPS</h2>
        <p className="page-header-desc">Vị trí thực tế của tàu đánh bắt và tàu thu gom, khoảng cách và thời gian di chuyển ước tính.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">

        {/* Interactive Sea Radar Map Screen */}
        <div className="lg:col-span-2 glass-panel stack-v">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
            <div className="flex flex-wrap items-center gap-2.5 text-sm font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-700 font-semibold">Vùng biển Vũng Tàu - Cát Lở - Nam Bộ</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-sky-600 hidden sm:inline">10.15°N - 10.40°N | 107.00°E - 107.25°E</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setFilterType('ALL')}
                className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Tất cả ({vessels.length})
              </button>
              <button
                onClick={() => setFilterType('FISHING')}
                className={`btn btn-sm ${filterType === 'FISHING' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ⛵ Tàu đánh bắt
              </button>
              <button
                onClick={() => setFilterType('COLLECTOR')}
                className={`btn btn-sm ${filterType === 'COLLECTOR' ? 'btn-success' : 'btn-secondary'}`}
              >
                🛥️ Tàu thu gom
              </button>
            </div>
          </div>

          {/* Interactive Sea Canvas Map Simulation */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-[480px] shadow-inner">
            <MapContainer
              center={[10.0, 107.5]}
              zoom={9}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filteredVessels.map((vessel) => (
                <Marker
                  key={vessel.id}
                  position={[vessel.lat, vessel.lng]}
                  icon={vessel.type === 'fishing' ? fishingIcon : collectorIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedVessel(vessel);
                      // Tránh trường hợp tàu đang chọn trùng với tàu đích tuyến đường
                      if (targetVesselForRoute && vessel.id === targetVesselForRoute.id) {
                        const alt = vessels.find(v => v.id !== vessel.id);
                        if (alt) setTargetVesselForRoute(alt);
                      }
                    },
                  }}
                >
                  <Popup>
                    <strong>{vessel?.code || 'N/A'}</strong><br />
                    Tốc độ: {vessel?.speedKnots || 0} knots<br />
                    Lat: {vessel?.lat?.toFixed(4) || '0.0000'}<br />
                    Lng: {vessel?.lng?.toFixed(4) || '0.0000'}
                  </Popup>
                </Marker>
              ))}

              {selectedVessel && targetVesselForRoute && (
                <Polyline
                  positions={[
                    [selectedVessel?.lat || 0, selectedVessel?.lng || 0],
                    [targetVesselForRoute?.lat || 0, targetVesselForRoute?.lng || 0]
                  ]}
                  pathOptions={{ color: '#0ea5e9', weight: 3, dashArray: '5, 10' }}
                />
              )}
            </MapContainer>
          </div>

          {/* Navigational Routing Summary Bar */}
          <div className="p-5 bg-sky-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-sky-100 rounded-xl text-sky-600 shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-xs mb-0.5">Đoạn Đường Gặp Nhau Hàng Hải:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm">{selectedVessel ? selectedVessel.name : 'Đang chờ...'}</span>
                  <span className="text-sky-500">➔</span>
                  {targetVesselForRoute ? (
                    <select
                      value={targetVesselForRoute.id}
                      onChange={(e) => setTargetVesselForRoute(vessels.find(v => v.id === e.target.value) || targetVesselForRoute)}
                      className="input-field text-xs font-bold py-1 px-2"
                    >
                      {otherVessels.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-500">Đang chờ...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div className="text-center">
                <span className="text-slate-500 block text-xs mb-0.5">Khoảng Cách:</span>
                <span className="text-sky-600 font-bold text-base">{currentDistanceNM} Hải Lý</span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 block text-xs mb-0.5">ETA:</span>
                <span className="text-emerald-600 font-bold text-base">{etaLabel}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Selected Vessel Side Panel Details */}
        <div className="lg:col-span-1 glass-panel stack-v">
          <div className="flex items-center justify-between section-divider">
            <h3 className="section-title">
              <Anchor className="w-5 h-5 text-sky-600" /> Thông Tin Tàu Đang Chọn
            </h3>
            <span className={`badge ${selectedVessel?.type === 'fishing' ? 'badge-cyan' : 'badge-emerald'}`}>
              {selectedVessel?.type === 'fishing' ? 'Tàu Đánh Bắt' : 'Tàu Thu Gom'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Số hiệu đăng kiểm:</span>
              <p className="text-base font-extrabold text-sky-700 font-mono">{selectedVessel?.code || 'N/A'}</p>
              <p className="text-sm text-slate-700">{selectedVessel?.name || 'Chưa rõ'}</p>
            </div>

            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Thuyền trưởng / Chủ tàu:</span>
              <p className="text-base font-bold text-slate-900">{selectedVessel?.captain || 'Chưa cập nhật'}</p>
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-4 h-4 text-emerald-600" /> {selectedVessel?.phone || '...'}
              </p>
            </div>

            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Cảng cá xuất bến:</span>
              <p className="text-sm text-slate-800 font-medium">{selectedVessel?.homePort || 'Cảng Cát Lở'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card">
                <span className="text-slate-500 text-xs">Tọa độ Kinh/Vĩ:</span>
                <span className="font-mono text-sky-700 font-bold block mt-1 text-sm">
                  {selectedVessel?.lat?.toFixed(4) || '0.0000'}°N<br />{selectedVessel?.lng?.toFixed(4) || '0.0000'}°E
                </span>
              </div>

              <div className="glass-card">
                <span className="text-slate-500 text-xs">Vận tốc & Pin:</span>
                <span className="font-mono text-emerald-700 font-bold block mt-1 text-sm">
                  {selectedVessel?.speedKnots || 0} Hải lý/h<br />🔋 {selectedVessel?.batteryPercent || 100}%
                </span>
              </div>
            </div>
          </div>

          <div className="info-box info-box-sky">
            📡 Tín hiệu định vị GPS được đồng bộ qua hệ thống vệ tinh hàng hải AIS mỗi 10 giây.
          </div>
        </div>

      </div>

    </div>
  );
}
