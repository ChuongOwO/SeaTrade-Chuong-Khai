import React, { useState } from 'react';
import { 
  Navigation, 
  Anchor, 
  Zap, 
  Phone
} from 'lucide-react';

export default function MaritimeMap({ vessels, posts, orders }) {
  const [selectedVessel, setSelectedVessel] = useState(vessels[0]);
  const [targetVesselForRoute, setTargetVesselForRoute] = useState(vessels[3]);
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

  const currentDistanceNM = calculateDistanceNM(
    selectedVessel.lat, selectedVessel.lng,
    targetVesselForRoute.lat, targetVesselForRoute.lng
  );

  return (
    <div className="page-section">
      
      {/* Header Banner */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="badge badge-cyan">Hệ Thống Định Vị Vùng Biển Realtime</span>
              <span className="text-sm text-slate-500 font-mono">Bản Đồ Số Hàng Hải Việt Nam</span>
            </div>
            <h2 className="page-header-title flex items-center gap-2.5">
              <Navigation className="w-7 h-7 text-sky-600" /> Bản Đồ Hải Trình & Chỉ Đường Tọa Độ GPS
            </h2>
            <p className="page-header-desc">
              Xác định chính xác kinh độ, vĩ độ của các tàu đánh bắt và tàu thu gom ngoài khơi, tự động tính khoảng cách hải lý (NM), nhiên liệu tiêu thụ và hỗ trợ chỉ đường theo vector tọa độ GPS.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filterType === 'ALL' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({vessels.length})
            </button>
            <button
              onClick={() => setFilterType('FISHING')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filterType === 'FISHING' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⛵ Tàu đánh bắt
            </button>
            <button
              onClick={() => setFilterType('COLLECTOR')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filterType === 'COLLECTOR' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🛥️ Tàu thu gom
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">
        
        {/* Interactive Sea Radar Map Screen */}
        <div className="lg:col-span-2 glass-panel stack-v">
          <div className="section-divider">
            <div className="flex flex-wrap items-center gap-2.5 text-sm font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-700 font-semibold">Vùng biển Vũng Tàu - Cát Lở - Nam Bộ</span>
              <span className="text-slate-300">•</span>
              <span className="text-sky-600">10.15°N - 10.40°N | 107.00°E - 107.25°E</span>
            </div>
          </div>

          {/* Interactive Sea Canvas Map Simulation */}
          <div className="relative rounded-2xl overflow-hidden border border-sky-300/50 bg-[#06101e] h-[480px] flex items-center justify-center shadow-inner">
            
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="absolute w-[500px] h-[500px] rounded-full border border-sky-500/10 pointer-events-none flex items-center justify-center">
              <div className="w-[300px] h-[300px] rounded-full border border-sky-500/20" />
              <div className="w-[150px] h-[150px] rounded-full border border-sky-500/30" />
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <line
                x1="32%"
                y1="38%"
                x2="68%"
                y2="70%"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              <circle cx="50%" cy="54%" r="16" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1" />
              <text x="50%" y="55%" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {currentDistanceNM} Hải lý (NM)
              </text>
            </svg>

            {filteredVessels.map((vessel, idx) => {
              const isSelected = selectedVessel.id === vessel.id;
              const isFishing = vessel.type === 'fishing';

              const positions = [
                { top: '38%', left: '32%' },
                { top: '62%', left: '78%' },
                { top: '75%', left: '22%' },
                { top: '70%', left: '68%' },
                { top: '28%', left: '60%' }
              ];

              const pos = positions[idx % positions.length];

              return (
                <button
                  key={vessel.id}
                  onClick={() => setSelectedVessel(vessel)}
                  style={{ top: pos.top, left: pos.left }}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                  }`}
                >
                  <div className={`p-2.5 rounded-full border shadow-xl flex items-center justify-center transition-all ${
                    isFishing
                      ? 'bg-sky-950/90 border-sky-400 text-sky-400 shadow-sky-500/30'
                      : 'bg-emerald-950/90 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                  } ${isSelected ? 'ring-4 ring-cyan-400/40' : ''}`}>
                    {isFishing ? <Anchor className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>

                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-lg text-[10px] font-mono text-white whitespace-nowrap shadow">
                    {vessel.code} ({vessel.speedKnots}Knots)
                  </div>
                </button>
              );
            })}

            <div className="absolute top-4 left-4 p-3 bg-slate-900/85 rounded-xl border border-slate-700 text-xs text-slate-300">
              <span className="font-bold text-sky-300 block">📍 Cảng Cá Cát Lở - Vũng Tàu</span>
              <span className="text-slate-400 mt-0.5 block">Trạm phát sóng GPS số 04</span>
            </div>

          </div>

          {/* Navigational Routing Summary Bar */}
          <div className="p-5 bg-sky-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">Đoạn Đường Gặp Nhau Hàng Hải:</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {selectedVessel.name} ➔ {targetVesselForRoute.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div className="text-center">
                <span className="text-slate-500 block text-xs mb-0.5">Khoảng Cách:</span>
                <span className="text-sky-600 font-bold text-base">{currentDistanceNM} Hải Lý</span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 block text-xs mb-0.5">ETA:</span>
                <span className="text-emerald-600 font-bold text-base">~18 Phút</span>
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
            <span className={`badge ${selectedVessel.type === 'fishing' ? 'badge-cyan' : 'badge-emerald'}`}>
              {selectedVessel.type === 'fishing' ? 'Tàu Đánh Bắt' : 'Tàu Thu Gom'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Số hiệu đăng kiểm:</span>
              <p className="text-base font-extrabold text-sky-700 font-mono">{selectedVessel.code}</p>
              <p className="text-sm text-slate-700">{selectedVessel.name}</p>
            </div>

            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Thuyền trưởng / Chủ tàu:</span>
              <p className="text-base font-bold text-slate-900">{selectedVessel.captain}</p>
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-4 h-4 text-emerald-600" /> {selectedVessel.phone}
              </p>
            </div>

            <div className="glass-card space-y-1">
              <span className="text-slate-500 text-xs">Cảng cá xuất bến:</span>
              <p className="text-sm text-slate-800 font-medium">{selectedVessel.homePort}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card">
                <span className="text-slate-500 text-xs">Tọa độ Kinh/Vĩ:</span>
                <span className="font-mono text-sky-700 font-bold block mt-1 text-sm">
                  {selectedVessel.lat.toFixed(4)}°N<br/>{selectedVessel.lng.toFixed(4)}°E
                </span>
              </div>

              <div className="glass-card">
                <span className="text-slate-500 text-xs">Vận tốc & Pin:</span>
                <span className="font-mono text-emerald-700 font-bold block mt-1 text-sm">
                  {selectedVessel.speedKnots} Hải lý/h<br/>🔋 {selectedVessel.batteryPercent}%
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
