import React, { useState } from 'react';
import { 
  Camera, 
  MapPin, 
  Navigation, 
  Send, 
  CheckCircle, 
  Clock, 
  Wifi, 
  Radio, 
  Anchor, 
  Compass, 
  Phone, 
  DollarSign, 
  Layers, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Sliders,
  Award
} from 'lucide-react';
import { SEAFOOD_SPECIES } from '../data/mockData';

export default function MobileAppSimulator({ posts, setPosts, vessels, orders, setOrders, offlineMode, activeRole, setActiveRole }) {
  const [mobileTab, setMobileTab] = useState('HOME'); // 'HOME', 'SCAN_POST', 'ORDERS'
  
  // Fisherman Mode State: AI Scanning & Post Creation
  const [selectedSamplePhoto, setSelectedSamplePhoto] = useState(SEAFOOD_SPECIES[0]);
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [aiScanResult, setAiScanResult] = useState(null);
  const [inputVolumeKg, setInputVolumeKg] = useState('350');
  const [inputAskingPrice, setInputAskingPrice] = useState('');
  const [postSuccessMsg, setPostSuccessMsg] = useState(false);

  // Trader Mode State: Search, Filter & Order Deal
  const [selectedPostForTrade, setSelectedPostForTrade] = useState(null);
  const [tradeOfferPrice, setTradeOfferPrice] = useState('');
  const [tradeConfirmedModal, setTradeConfirmedModal] = useState(null);

  // Simulated AI Photo Scan Handler
  const handleStartAIScan = () => {
    setIsScanningAI(true);
    setAiScanResult(null);

    setTimeout(() => {
      setIsScanningAI(false);
      const matched = selectedSamplePhoto;
      const confidence = (96.0 + Math.random() * 3.5).toFixed(1);
      const freshness = (94.0 + Math.random() * 5.0).toFixed(1);
      const suggestedPrice = Math.round((matched.basePriceMin + matched.basePriceMax) / 2);
      
      const result = {
        speciesId: matched.id,
        speciesName: matched.name,
        scientificName: matched.scientificName,
        category: matched.category,
        confidenceScore: confidence,
        freshnessScore: freshness,
        aiGrade: matched.grades[0].grade,
        suggestedPricePerKg: suggestedPrice,
        image: matched.sampleImage
      };
      
      setAiScanResult(result);
      setInputAskingPrice(suggestedPrice.toString());
    }, 1500);
  };

  // Submit Post to Marketplace
  const handlePublishPost = (e) => {
    e.preventDefault();
    if (!aiScanResult) return;

    const newPost = {
      id: `post-${Date.now().toString().slice(-4)}`,
      vesselId: 'vessel-01',
      vesselCode: 'BV-98234-TS',
      vesselName: 'Tàu Hải Nam 09',
      captain: 'Nguyễn Văn Hùng',
      phone: '0912.345.678',
      speciesId: aiScanResult.speciesId,
      speciesName: aiScanResult.speciesName,
      category: aiScanResult.category,
      estimatedQuantityKg: parseInt(inputVolumeKg) || 100,
      aiGrade: aiScanResult.aiGrade,
      aiFreshnessScore: parseFloat(aiScanResult.freshnessScore),
      aiConfidenceScore: parseFloat(aiScanResult.confidenceScore),
      aiSuggestedPricePerKg: aiScanResult.suggestedPricePerKg,
      askingPricePerKg: parseInt(inputAskingPrice) || aiScanResult.suggestedPricePerKg,
      totalValue: (parseInt(inputVolumeKg) || 100) * (parseInt(inputAskingPrice) || aiScanResult.suggestedPricePerKg),
      lat: 10.3245,
      lng: 107.1240,
      catchTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      image: aiScanResult.image,
      status: 'OPEN',
      distanceNauticalMiles: 2.5,
      offersCount: 0
    };

    setPosts([newPost, ...posts]);
    setPostSuccessMsg(true);
    setTimeout(() => {
      setPostSuccessMsg(false);
      setMobileTab('HOME');
      setAiScanResult(null);
    }, 1800);
  };

  // Trader Confirm Order
  const handleConfirmOrderDeal = (post) => {
    const finalPrice = parseInt(tradeOfferPrice) || post.askingPricePerKg;
    const newOrder = {
      id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      postId: post.id,
      sellerVesselCode: post.vesselCode,
      sellerName: post.vesselName,
      buyerVesselCode: 'TG-88219-TG',
      buyerName: 'Tàu Thu Gom Sông Tiền 01',
      buyerCaptain: 'Phạm Quốc Cường',
      speciesName: post.speciesName,
      quantityKg: post.estimatedQuantityKg,
      agreedPricePerKg: finalPrice,
      totalAmount: post.estimatedQuantityKg * finalPrice,
      dealLocationLat: post.lat,
      dealLocationLng: post.lng,
      status: 'IN_TRANSIT',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      rating: null,
      review: null
    };

    // Update post status to LOCKED
    setPosts(posts.map(p => p.id === post.id ? { ...p, status: 'IN_NEGOTIATION' } : p));
    setOrders([newOrder, ...orders]);
    setSelectedPostForTrade(null);
    setTradeConfirmedModal(newOrder);
  };

  return (
    <div className="page-section items-center">
      
      {/* Page intro */}
      <div className="page-header w-full">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="badge badge-cyan">Mobile App Simulator</span>
            <span className="text-sm text-slate-500 font-mono">Ngư dân & Thương lái</span>
          </div>
          <h2 className="page-header-title">Mô Phỏng Ứng Dụng Di Động SeaTrade AI</h2>
          <p className="page-header-desc">
            Trải nghiệm giao diện mobile dành cho thuyền trưởng tàu đánh bắt và tàu thu gom — quét AI, đăng bán hải sản và chốt đơn trực tiếp ngoài khơi.
          </p>
        </div>
      </div>

      {/* Role Toggle Switcher */}
      <div className="glass-panel p-2.5 flex items-center gap-2.5 rounded-2xl shadow-md">
        <button
          onClick={() => { setActiveRole('FISHERMAN'); setMobileTab('HOME'); }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
            activeRole === 'FISHERMAN'
              ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-500/25'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Anchor className="w-4 h-4" /> ⛵ Thuyền Trưởng Tàu Đánh Bắt
        </button>
        <button
          onClick={() => { setActiveRole('TRADER'); setMobileTab('HOME'); }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
            activeRole === 'TRADER'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-4 h-4" /> 🛥️ Tàu Thu Gom / Thương Lái
        </button>
      </div>

      {/* Main Mobile Smartphone Frame Container */}
      <div className="mobile-frame">
        
        {/* Top Notch & Phone Header */}
        <div className="mobile-notch">
          <div className="mobile-notch-camera" />
          <div className="mobile-notch-speaker" />
        </div>

        {/* Mobile Screen Header */}
        <div className="pt-8 px-4 pb-3 bg-gradient-to-b from-[#0b132b] to-[#070d19] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold text-sky-300 font-mono">
              {activeRole === 'FISHERMAN' ? 'BV-98234-TS' : 'TG-88219-TG'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            {offlineMode ? (
              <span className="text-amber-400 flex items-center gap-1 font-bold">
                <Radio className="w-3 h-3 animate-pulse" /> OFFLINE SYNC (3 queued)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <Wifi className="w-3 h-3" /> GPS ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Mobile Screen Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {/* ============================================================== */}
          {/* FISHERMAN ROLE VIEWS */}
          {/* ============================================================== */}
          {activeRole === 'FISHERMAN' && (
            <>
              {mobileTab === 'HOME' && (
                <div className="space-y-4">
                  
                  {/* Captain Status Card */}
                  <div className="glass-panel p-4 bg-gradient-to-r from-sky-950/60 to-slate-900 border-sky-500/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="badge badge-cyan text-[9px]">Thuyền Trưởng Vùng Biển Nam Bộ</span>
                        <h3 className="text-sm font-bold text-white mt-1">Tàu Hải Nam 09 (BV-98234-TS)</h3>
                        <p className="text-[11px] text-slate-300">Thuyền trưởng: Nguyễn Văn Hùng</p>
                      </div>
                      <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
                        <Anchor className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <span className="text-slate-400 block">Tọa độ GPS:</span>
                        <span className="font-mono text-sky-300 font-bold">10.324°N, 107.124°E</span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <span className="text-slate-400 block">Tốc độ & Hướng:</span>
                        <span className="font-mono text-emerald-300 font-bold">8.5 Hải lý/h • 145°</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Vision Scanner Quick Trigger Banner */}
                  <div className="glass-panel p-4 bg-gradient-to-r from-sky-900/40 via-cyan-900/30 to-slate-900 border-cyan-400/40 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto animate-pulse">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Vừa Trúng Mẻ Hải Sản Trực Tiếp?</h4>
                    <p className="text-[11px] text-slate-300">
                      Chụp ảnh hải sản ngay để AI YOLOv8 tự động nhận dạng loài, đánh giá độ tươi và tạo bài đăng bán kèm sản lượng dự kiến!
                    </p>
                    <button
                      onClick={() => setMobileTab('SCAN_POST')}
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Quét AI & Đăng Bán Tốc Hành
                    </button>
                  </div>

                  {/* Active Listings on Boat */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span>Bài Đăng Của Tàu (2 bài)</span>
                      <span className="text-[10px] text-sky-400">Xem tất cả</span>
                    </div>

                    {posts.filter(p => p.vesselCode === 'BV-98234-TS').map((post) => (
                      <div key={post.id} className="glass-panel p-3 flex gap-3 items-center border-slate-800">
                        <img src={post.image} alt={post.speciesName} className="w-14 h-14 rounded-lg object-cover border border-sky-500/30" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-white text-xs">{post.speciesName}</h5>
                            <span className="badge badge-emerald text-[8px]">{post.status}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{post.estimatedQuantityKg} kg • {post.aiGrade}</p>
                          <p className="text-xs font-mono font-extrabold text-amber-400 mt-1">
                            {post.askingPricePerKg.toLocaleString()} đ/kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* SCAN_POST: AI Camera Scanner & Create Post */}
              {mobileTab === 'SCAN_POST' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" /> Phân Loại AI & Tạo Bài Đăng
                    </h3>
                    <button onClick={() => setMobileTab('HOME')} className="text-slate-400 hover:text-white text-xs">Hủy</button>
                  </div>

                  {postSuccessMsg ? (
                    <div className="p-6 text-center space-y-3 glass-panel bg-emerald-950/40 border-emerald-500/40">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                      <h4 className="font-bold text-emerald-300 text-base">Đăng Tin Thành Công!</h4>
                      <p className="text-xs text-slate-300">
                        Bài rao hải sản đã phát sóng lên bản đồ hải trình định vị real-time. Tàu thu gom trong bán kính 10 hải lý có thể nhìn thấy và chốt đơn ngay!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Step 1: Select Seafood Sample Image */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          1. Chụp/Chọn ảnh hải sản vừa kéo lưới:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {SEAFOOD_SPECIES.map((spec) => (
                            <button
                              key={spec.id}
                              onClick={() => { setSelectedSamplePhoto(spec); setAiScanResult(null); }}
                              className={`p-1.5 rounded-xl border text-left transition-all ${
                                selectedSamplePhoto.id === spec.id
                                  ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/30'
                                  : 'border-slate-800 bg-slate-900/60 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={spec.sampleImage} alt={spec.name} className="w-full h-12 object-cover rounded-lg mb-1" />
                              <span className="text-[10px] font-semibold text-white block truncate">{spec.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Trigger AI Vision Scan */}
                      <div className="glass-panel p-3 border-sky-500/30 bg-slate-900/80">
                        <div className="relative rounded-xl overflow-hidden mb-3">
                          <img src={selectedSamplePhoto.sampleImage} alt="Scanning" className="w-full h-40 object-cover" />
                          {isScanningAI && (
                            <div className="absolute inset-0 bg-sky-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs font-bold text-cyan-300 animate-pulse">Model YOLOv8 đang phân tích...</span>
                            </div>
                          )}

                          {aiScanResult && (
                            <div className="absolute inset-2 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex flex-col justify-between">
                              <span className="bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded self-start shadow">
                                Verified: {aiScanResult.speciesName} ({aiScanResult.confidenceScore}%)
                              </span>
                              <span className="bg-slate-900/90 text-emerald-300 text-[10px] px-2 py-0.5 rounded self-end font-mono">
                                {aiScanResult.aiGrade}
                              </span>
                            </div>
                          )}
                        </div>

                        {!aiScanResult ? (
                          <button
                            onClick={handleStartAIScan}
                            disabled={isScanningAI}
                            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                          >
                            <Zap className="w-4 h-4" /> Chạy Mô-Đun Quét AI
                          </button>
                        ) : (
                          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Loài nhận diện:</span>
                              <span className="font-bold text-emerald-300">{aiScanResult.speciesName}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Đánh giá độ tươi:</span>
                              <span className="font-bold text-emerald-400 font-mono">{aiScanResult.freshnessScore}% (Rất tươi)</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Gợi ý định giá AI:</span>
                              <span className="font-bold text-amber-400 font-mono">{aiScanResult.suggestedPricePerKg.toLocaleString()} đ/kg</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Step 3: Prefilled Post Form */}
                      {aiScanResult && (
                        <form onSubmit={handlePublishPost} className="space-y-3 glass-panel p-3 border-emerald-500/30">
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">
                              Sản lượng ước tính (kg):
                            </label>
                            <input
                              type="number"
                              value={inputVolumeKg}
                              onChange={(e) => setInputVolumeKg(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">
                              Đơn giá mong muốn (VNĐ/kg):
                            </label>
                            <input
                              type="number"
                              value={inputAskingPrice}
                              onChange={(e) => setInputAskingPrice(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-amber-300 text-xs font-bold"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors"
                          >
                            <Send className="w-4 h-4" /> Phát Sóng Rao Bán Lên Bản Đồ Biển
                          </button>
                        </form>
                      )}
                    </>
                  )}

                </div>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* TRADER ROLE VIEWS */}
          {/* ============================================================== */}
          {activeRole === 'TRADER' && (
            <div className="space-y-4">
              
              {/* Trader Status Header */}
              <div className="glass-panel p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/30">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge badge-emerald text-[9px]">Tàu Thu Gom / Thương Lái</span>
                    <h3 className="text-sm font-bold text-white mt-1">Tàu Thu Gom Sông Tiền 01</h3>
                    <p className="text-[11px] text-slate-300">Thương lái: Phạm Quốc Cường</p>
                  </div>
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-emerald-300 flex items-center gap-2">
                  <span>Sức chứa hầm lạnh: 25 Tấn</span>
                  <span>•</span>
                  <span>Đã tải: 6.4 Tấn (Còn trống 18.6 Tấn)</span>
                </div>
              </div>

              {/* Nearest Fishing Boats List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-sky-400" /> Tàu Có Hàng Gần Nhất
                  </span>
                  <span className="text-[10px] text-slate-400">Phạm vi 10 Hải Lý</span>
                </div>

                {posts.map((post) => (
                  <div key={post.id} className="glass-panel p-3 space-y-2 border-slate-800 hover:border-emerald-500/40 transition-all">
                    <div className="flex gap-3">
                      <img src={post.image} alt={post.speciesName} className="w-16 h-16 rounded-xl object-cover border border-emerald-500/30" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-xs">{post.speciesName}</h4>
                          <span className="text-[10px] font-mono text-sky-300 font-bold">{post.distanceNauticalMiles} Hải Lý</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{post.vesselCode} • {post.vesselName}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">{post.aiGrade}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-sm font-extrabold text-amber-400">
                            {post.askingPricePerKg.toLocaleString()} đ/kg
                          </span>
                          <span className="text-[10px] font-mono text-slate-300">{post.estimatedQuantityKg} kg</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => { setSelectedPostForTrade(post); setTradeOfferPrice(post.askingPricePerKg.toString()); }}
                      className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" /> Xem Chi Tiết & Chốt Đơn
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* ORDER HISTORY (shared by both roles)                            */}
          {/* ============================================================== */}
          {mobileTab === 'ORDERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" /> Lịch Sử Giao Dịch
                </h3>
                <button onClick={() => setMobileTab('HOME')} className="text-slate-400 hover:text-white text-xs">Đóng</button>
              </div>

              {orders.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Chưa có đơn hàng nào được chốt.</div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="glass-panel p-3 space-y-2 border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-300 text-xs font-bold">{order.id}</span>
                      <span className={`badge-sm ${
                        order.status === 'COMPLETED' ? 'badge-emerald' :
                        order.status === 'IN_TRANSIT' ? 'badge-cyan' : 'badge-amber'
                      }`}>
                        {order.status === 'COMPLETED' ? 'Hoàn tất' : order.status === 'IN_TRANSIT' ? 'Đang giao' : 'Đã hủy'}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-xs">{order.speciesName} • {order.quantityKg} kg</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{order.sellerName} → {order.buyerName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{order.timestamp}</span>
                      <span className="font-mono text-amber-400 font-bold">{order.totalAmount.toLocaleString()} đ</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Mobile Screen Bottom Navigation Bar */}
        <div className="p-2 bg-[#070d19] border-t border-slate-800 flex justify-around text-[10px] text-slate-400">
          <button
            onClick={() => setMobileTab('HOME')}
            className={`flex flex-col items-center gap-1 p-1 ${mobileTab === 'HOME' ? 'text-cyan-400 font-bold' : ''}`}
          >
            <Anchor className="w-4 h-4" /> Trang chủ
          </button>
          {activeRole === 'FISHERMAN' ? (
            <button
              onClick={() => setMobileTab('SCAN_POST')}
              className={`flex flex-col items-center gap-1 p-1 ${mobileTab === 'SCAN_POST' ? 'text-cyan-400 font-bold' : ''}`}
            >
              <Camera className="w-4 h-4" /> Quét AI
            </button>
          ) : (
            <button
              onClick={() => setMobileTab('HOME')}
              className={`flex flex-col items-center gap-1 p-1 ${mobileTab === 'HOME' ? 'text-emerald-400 font-bold' : ''}`}
            >
              <Compass className="w-4 h-4" /> Rada Biển
            </button>
          )}
          <button
            onClick={() => setMobileTab('ORDERS')}
            className={`flex flex-col items-center gap-1 p-1 ${mobileTab === 'ORDERS' ? 'text-cyan-400 font-bold' : ''}`}
          >
            <Clock className="w-4 h-4" /> Lịch sử ({orders.length})
          </button>
        </div>

      </div>

      {/* Trade Offer Modal for Trader */}
      {selectedPostForTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-5 space-y-4 border-emerald-400/50">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="badge badge-emerald">Chốt Đơn Giao Thương Hải Sản</span>
              <button onClick={() => setSelectedPostForTrade(null)} className="text-slate-400 text-sm">✕</button>
            </div>

            <div className="flex gap-3 items-center">
              <img src={selectedPostForTrade.image} alt={selectedPostForTrade.speciesName} className="w-16 h-16 rounded-xl object-cover border border-emerald-500/30" />
              <div>
                <h4 className="font-bold text-white text-sm">{selectedPostForTrade.speciesName}</h4>
                <p className="text-xs text-slate-400">{selectedPostForTrade.vesselName} ({selectedPostForTrade.vesselCode})</p>
                <p className="text-xs text-emerald-400 font-mono">Sản lượng: {selectedPostForTrade.estimatedQuantityKg} kg</p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Khoảng cách tọa độ biển:</span>
                <span className="font-mono text-sky-300 font-bold">{selectedPostForTrade.distanceNauticalMiles} Hải lý</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giá ngư dân rao:</span>
                <span className="font-mono text-amber-400 font-bold">{selectedPostForTrade.askingPricePerKg.toLocaleString()} đ/kg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nhập giá thỏa thuận chốt mua (đ/kg):
              </label>
              <input
                type="number"
                value={tradeOfferPrice}
                onChange={(e) => setTradeOfferPrice(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl font-mono text-emerald-300 text-sm font-bold"
              />
            </div>

            <button
              onClick={() => handleConfirmOrderDeal(selectedPostForTrade)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Chốt Đơn & Bật Chỉ Đường GPS Di Chuyển
            </button>
          </div>
        </div>
      )}

      {/* Trade Confirmed Navigation Modal */}
      {tradeConfirmedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 space-y-4 border-cyan-400/50 shadow-2xl text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-extrabold text-white">Đã Chốt Đơn Thành Công!</h3>
            <p className="text-xs text-slate-300">
              Mã đơn hàng: <span className="font-mono text-cyan-300 font-bold">{tradeConfirmedModal.id}</span>
            </p>

            <div className="p-4 bg-slate-900/90 rounded-2xl border border-sky-500/30 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Tàu bán:</span>
                <span className="font-bold text-white">{tradeConfirmedModal.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mặt hàng:</span>
                <span className="font-bold text-emerald-300">{tradeConfirmedModal.speciesName} ({tradeConfirmedModal.quantityKg} kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tổng thanh toán:</span>
                <span className="font-mono text-amber-400 font-extrabold">{tradeConfirmedModal.totalAmount.toLocaleString()} VNĐ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tọa độ gặp nhau:</span>
                <span className="font-mono text-sky-300">{tradeConfirmedModal.dealLocationLat}°N, {tradeConfirmedModal.dealLocationLng}°E</span>
              </div>
            </div>

            <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-500/30 text-xs text-sky-200 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-sky-400 animate-spin" />
              <span>Chỉ đường GPS đang hướng dẫn 2 tàu di chuyển lại gần nhau trên hải trình.</span>
            </div>

            <button
              onClick={() => setTradeConfirmedModal(null)}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs"
            >
              Hoàn Tất & Về Trang Chủ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
