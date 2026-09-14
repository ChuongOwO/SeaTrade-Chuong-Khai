import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Anchor,
  Zap,
  Phone
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { fetchVesselsLocations } from '../api/vessels';
import { MAP_TILE_URL, MAP_TILE_ATTRIBUTION, MAP_TILE_SUBDOMAINS, MAP_TILE_MAX_ZOOM } from '../config/mapTiles';

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

// Chuyển 1 bản ghi từ GET /api/vessels/locations (schema thật) sang đúng hình
// dạng mà UI bên dưới đang dùng (vốn được viết theo mockData.js trước đây).
// API thật chưa có captain/phone/homePort/batteryPercent -> để null, các chỗ
// hiển thị bên dưới đã có fallback "Chưa cập nhật"/"N/A" nên không bị vỡ giao diện.
const mapApiVessel = (v) => ({
  id: v.vessel_id,
  code: v.vessel_id ? String(v.vessel_id).slice(0, 8).toUpperCase() : 'N/A',
  name: v.vessel_name,
  type: v.vessel_type === 'COLLECTION' ? 'collector' : 'fishing',
  lat: parseFloat(v.latitude),
  lng: parseFloat(v.longitude),
  speedKnots: v.speed ? parseFloat(v.speed) : 0,
  heading: v.heading,
  lastSeen: v.recorded_at,
  captain: null,
  phone: null,
  homePort: null,
  batteryPercent: null,
});

export default function MaritimeMap({ vessels, posts, orders }) {
  // Bắt đầu bằng dữ liệu mẫu (prop `vessels`) để bản đồ không trống trong lúc
  // chờ gọi API lần đầu, rồi thay bằng vị trí GPS thật ngay khi có.
  const [liveVessels, setLiveVessels] = useState(vessels);
  const [isLive, setIsLive] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Gọi GET /api/vessels/locations mỗi 10s — đồng bộ đúng nhịp poll mà Mobile
  // App đang dùng (xem mobile/src/screens/HomeScreen.js: fetchVesselsLocations).
  useEffect(() => {
    let cancelled = false;

    const loadLocations = async () => {
      try {
        const data = await fetchVesselsLocations();
        const mapped = data
          .filter((v) => v.latitude != null && v.longitude != null)
          .map(mapApiVessel);
        if (cancelled) return;
        if (mapped.length > 0) {
          setLiveVessels(mapped);
          setIsLive(true);
          setLoadError(null);
        } else {
          // Chưa có tàu nào gửi GPS thật -> tiếp tục hiện dữ liệu mẫu để demo
          setIsLive(false);
        }
      } catch (err) {
        if (cancelled) return;
        setIsLive(false);
        setLoadError(err.message || 'Không tải được vị trí tàu từ server');
      }
    };

    loadLocations();
    const interval = setInterval(loadLocations, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const [selectedVessel, setSelectedVessel] = useState(liveVessels[0] || null);
  const [targetVesselForRoute, setTargetVesselForRoute] = useState(liveVessels.length > 1 ? liveVessels[1] : (liveVessels[0] || null));
  const [filterType, setFilterType] = useState('ALL');

  // Khi dữ liệu chuyển từ mẫu sang GPS thật (hoặc ngược lại), chọn lại tàu đầu
  // tiên của danh sách mới — tránh panel "Tàu Đang Chọn" treo vào tàu cũ đã
  // không còn trong danh sách (mock dùng id số, API thật dùng UUID).
  useEffect(() => {
    setSelectedVessel(liveVessels[0] || null);
    setTargetVesselForRoute(liveVessels.length > 1 ? liveVessels[1] : (liveVessels[0] || null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  const filteredVessels = liveVessels.filter(v => {
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

  const otherVessels = selectedVessel ? liveVessels.filter(v => v.id !== selectedVessel.id) : liveVessels;

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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border font-sans ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isLive ? '📡 GPS thực từ Mobile App' : '🧪 Dữ liệu mẫu (chưa có tàu gửi GPS)'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setFilterType('ALL')}
                className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Tất cả ({liveVessels.length})
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

          {loadError && (
            <p className="text-xs text-rose-600 -mt-2">⚠️ {loadError} — đang hiện dữ liệu mẫu tạm thời.</p>
          )}

          {/* Interactive Sea Canvas Map Simulation */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-[480px] shadow-inner">
            <MapContainer
              center={[10.0, 107.5]}
              zoom={9}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Nguồn tile lấy từ config/mapTiles.js — đổi nguồn bản đồ (VD: khi có
                  API key CartoDB) chỉ cần sửa file đó, không cần sửa ở đây. */}
              <TileLayer
                attribution={MAP_TILE_ATTRIBUTION}
                url={MAP_TILE_URL}
                maxZoom={MAP_TILE_MAX_ZOOM}
                {...(MAP_TILE_SUBDOMAINS ? { subdomains: MAP_TILE_SUBDOMAINS } : {})}
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
                        const alt = liveVessels.find(v => v.id !== vessel.id);
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
                      onChange={(e) => setTargetVesselForRoute(liveVessels.find(v => v.id === e.target.value) || targetVesselForRoute)}
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
            📡 Vị trí được đồng bộ mỗi 10 giây, lấy từ GPS thật do Mobile App gửi lên
            khi tàu đang mở app và bật định vị (xem nút "Bật Định Vị Vùng Biển" trên
            điện thoại). Tàu chưa từng gửi vị trí sẽ không xuất hiện ở đây.
          </div>
        </div>

      </div>

    </div>
  );
}
