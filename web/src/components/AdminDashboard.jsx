import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Anchor, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Eye, 
  Cpu, 
  MapPin, 
  DollarSign, 
  Layers, 
  FileText,
  Shield,
  ArrowUpRight
} from 'lucide-react';
import { MARKET_PRICE_INDEX, SEAFOOD_SPECIES } from '../data/mockData';

export default function AdminDashboard({ posts, setPosts, vessels, orders }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPostModal, setSelectedPostModal] = useState(null);

  // Statistics calculation
  const totalVolumeKg = posts.reduce((sum, p) => sum + p.estimatedQuantityKg, 0);
  const totalValueVnd = posts.reduce((sum, p) => sum + p.totalValue, 0);
  const activeFishingVessels = vessels.filter(v => v.type === 'fishing').length;
  const activeCollectorVessels = vessels.filter(v => v.type === 'collector').length;

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.speciesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.vesselCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.captain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page-section">
      


      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-v">
        
        {/* Card 1: Tổng Sản Lượng */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Sản Lượng Rao Bán Biển</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value">{totalVolumeKg.toLocaleString()}</span>
            <span className="text-sm font-semibold text-sky-600">kg</span>
          </div>
          <p className="text-sm text-emerald-600 mt-3 flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-4 h-4" /> +18.4% so với hôm qua
          </p>
        </div>

        {/* Card 2: Tổng Giá Trị Giao Dịch */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Giá Trị Đang Rao</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value text-emerald-600">{(totalValueVnd / 1000000).toFixed(1)}</span>
            <span className="text-sm font-semibold text-emerald-700">Triệu VNĐ</span>
          </div>
          <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động định giá gợi ý bởi AI
          </p>
        </div>

        {/* Card 3: Đội Tàu Hoạt Động */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đội Tàu Đang Định Vị GPS</span>
            <div className="p-2.5 bg-cyan-100 rounded-xl text-cyan-600">
              <Anchor className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value">{activeFishingVessels + activeCollectorVessels}</span>
            <span className="text-sm text-slate-500">Tàu thuyền</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5 text-sky-700"><span className="w-2 h-2 rounded-full bg-sky-500"></span> {activeFishingVessels} Đánh bắt</span>
            <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {activeCollectorVessels} Thu gom</span>
          </div>
        </div>

        {/* Card 4: AI Model Health */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Độ Chính Xác YOLOv8 AI</span>
            <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value text-purple-700">98.4%</span>
            <span className="text-sm text-slate-500">mAP50</span>
          </div>
          <p className="text-sm text-purple-600 mt-3 flex items-center gap-1.5 font-medium">
            <Shield className="w-4 h-4 text-purple-500" /> Tự động phân loại 5 nhóm hải sản chính
          </p>
        </div>

      </div>

      {/* Grid 2 Columns: Market Price Index & Live Sea Post Moderation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">
        
        {/* Market Price Index Side Panel */}
        <div className="lg:col-span-1 glass-panel flex flex-col gap-v">
          <div className="section-divider">
            <h3 className="section-title">
              <TrendingUp className="w-5 h-5 text-sky-600" /> Chỉ Số Giá Hải Sản Thị Trường
            </h3>
            <p className="section-subtitle">Cập nhật theo kết quả giao dịch chốt đơn real-time</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {MARKET_PRICE_INDEX.map((item, idx) => (
              <div key={idx} className="glass-card flex items-center justify-between hover:border-sky-300 transition-all">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.species}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-500 font-mono">Grade A: {item.gradeA.toLocaleString()}đ</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-mono">Grade B: {item.gradeB.toLocaleString()}đ</span>
                  </div>
                </div>
                <div className="text-right pl-3">
                  <div className="text-sm font-extrabold text-sky-700 font-mono">
                    {item.avgPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">đ/kg</span>
                  </div>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold mt-1 ${
                    item.trend === 'UP' ? 'text-emerald-600' : item.trend === 'DOWN' ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    {item.trend === 'UP' ? <TrendingUp className="w-3.5 h-3.5" /> : item.trend === 'DOWN' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="info-box info-box-sky">
            💡 <strong>Khuyên dùng cho thương lái:</strong> Giá gợi ý AI giúp hạn chế ép giá ngư dân và duy trì ổn định chuỗi cung ứng thủy hải sản tươi sống.
          </div>
        </div>

        {/* Live Sea Posts Moderation & Table */}
        <div className="lg:col-span-2 glass-panel stack-v">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
            <div>
              <h3 className="section-title">
                <Layers className="w-5 h-5 text-emerald-600" /> Danh Sách Hải Sản Đăng Bán Ngoài Khơi
              </h3>
              <p className="section-subtitle">Bài đăng từ thuyền trưởng tích hợp kết quả quét ảnh AI YOLOv8 & GPS</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm loài, số tàu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field input-search w-full sm:w-52"
                />
              </div>

              <div className="relative shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field input-select pl-9 pr-8 py-2.5 rounded-xl border-slate-200 bg-white shadow-sm font-medium text-slate-700 hover:border-sky-300 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none outline-none cursor-pointer text-sm"
                >
                  <option value="ALL">Tất cả bài rào</option>
                  <option value="PREMIUM">Hải sản Cao cấp</option>
                  <option value="COMMON">Hải sản Phổ thông</option>
                </select>
              </div>

              <button type="button" className="btn-export-report px-3 py-2 h-10 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors shrink-0">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Xuất Báo Cáo</span>
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr>
                  <th>Hải Sản & Ảnh AI</th>
                  <th>Tàu Đánh Bắt / Vị Trí</th>
                  <th>Sản Lượng & Cấp Độ</th>
                  <th>Đơn Giá Rao</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    
                    {/* Species & Photo */}
                    <td>
                      <div className="flex items-center gap-3">
                        <img 
                          src={post.image} 
                          alt={post.speciesName} 
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-sm"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm">{post.speciesName}</h4>
                          <span className="badge-sm badge-cyan mt-1">
                            AI {post.aiConfidenceScore}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Vessel Info */}
                    <td>
                      <div className="font-semibold text-sky-700">{post.vesselCode}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{post.vesselName} • {post.captain}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>GPS: {post.lat.toFixed(3)}°N, {post.lng.toFixed(3)}°E</span>
                      </div>
                    </td>

                    {/* Volume & AI Grade */}
                    <td>
                      <div className="font-mono text-sm font-bold text-slate-900">{post.estimatedQuantityKg} kg</div>
                      <div className="text-emerald-600 text-xs font-medium mt-0.5">{post.aiGrade}</div>
                    </td>

                    {/* Price */}
                    <td>
                      <div className="font-mono text-sm font-extrabold text-amber-600">
                        {post.askingPricePerKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">đ/kg</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Tổng: {(post.totalValue / 1000000).toFixed(1)}Tr VNĐ
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {post.status === 'OPEN' && (
                        <span className="badge-sm badge-emerald">Đang rao</span>
                      )}
                      {post.status === 'IN_NEGOTIATION' && (
                        <span className="badge-sm badge-amber">Thương lượng</span>
                      )}
                      {post.status === 'LOCKED' && (
                        <span className="badge-sm badge-cyan">Đã chốt</span>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedPostModal(post)}
                        className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-sm font-semibold flex items-center gap-1.5 ml-auto transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" /> Chi tiết AI
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* AI Detail Inspection Modal */}
      {selectedPostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-2xl w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl">
            <button
              onClick={() => setSelectedPostModal(null)}
              className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-lg font-bold transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5">
              <span className="badge badge-cyan">Xác Thực AI Computer Vision</span>
              <span className="text-sm text-slate-500 font-mono">Mã bài đăng: #{selectedPostModal.id}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {selectedPostModal.speciesName} - {selectedPostModal.vesselCode}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Image Preview with Bounding Box overlay simulation */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img 
                  src={selectedPostModal.image} 
                  alt={selectedPostModal.speciesName} 
                  className="w-full h-56 object-cover"
                />
                {/* Simulated Bounding Box */}
                <div className="absolute inset-4 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg flex items-start justify-between p-2.5">
                  <span className="bg-emerald-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-md shadow">
                    YOLOv8: {selectedPostModal.speciesName} ({selectedPostModal.aiConfidenceScore}%)
                  </span>
                  <span className="bg-slate-900/90 text-emerald-300 font-mono text-xs px-2.5 py-1 rounded-md border border-emerald-500/40">
                    Grade A • Tươi Sống
                  </span>
                </div>
              </div>

              {/* Verified Specs */}
              <div className="space-y-3 text-sm">
                <div className="p-4 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                  <p className="text-slate-500 text-xs">Loài nhận dạng:</p>
                  <p className="text-base font-bold text-sky-700">{selectedPostModal.speciesName}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                  <p className="text-slate-500 text-xs">Độ tươi & Kích cỡ:</p>
                  <p className="text-base font-bold text-emerald-600">{selectedPostModal.aiGrade} (Độ tươi: {selectedPostModal.aiFreshnessScore}%)</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                  <p className="text-slate-500 text-xs">Gợi ý định giá AI:</p>
                  <p className="text-base font-mono font-bold text-amber-600">
                    {selectedPostModal.aiSuggestedPricePerKg.toLocaleString()} đ/kg
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPostModal(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
