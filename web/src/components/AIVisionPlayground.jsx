import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ShieldCheck,
  Layers,
  RefreshCw
} from 'lucide-react';
import { SEAFOOD_SPECIES } from '../data/mockData';

export default function AIVisionPlayground() {
  const [selectedSpecies, setSelectedSpecies] = useState(SEAFOOD_SPECIES[0]);
  const [customImage, setCustomImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

  const canvasRef = useRef(null);

  const runAIDetection = (speciesData, imageSrc) => {
    setIsProcessing(true);
    setDetectionResult(null);

    setTimeout(() => {
      setIsProcessing(false);

      const confidence = (96.5 + Math.random() * 3.0).toFixed(1);
      const freshnessScore = (94.0 + Math.random() * 5.0).toFixed(1);
      const estimatedWeightKg = (1.5 + Math.random() * 4.5).toFixed(1);
      const pricePerKg = Math.round((speciesData.basePriceMin + speciesData.basePriceMax) / 2);

      const result = {
        name: speciesData.name,
        scientificName: speciesData.scientificName,
        category: speciesData.category,
        confidence: confidence,
        freshness: freshnessScore,
        grade: speciesData.grades[0].grade,
        estimatedWeight: estimatedWeightKg,
        suggestedPrice: pricePerKg,
        imageSrc: imageSrc,
        boundingBoxes: [
          { x: 15, y: 18, width: 70, height: 65, label: `${speciesData.name} (${confidence}%)` }
        ]
      };

      setDetectionResult(result);
    }, 1200);
  };

  useEffect(() => {
    runAIDetection(selectedSpecies, selectedSpecies.sampleImage);
  }, [selectedSpecies]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target.result);
        const randomSpecies = SEAFOOD_SPECIES[Math.floor(Math.random() * SEAFOOD_SPECIES.length)];
        runAIDetection(randomSpecies, event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page-section">
      
      {/* Top Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="page-header-title">Studio Phân Loại & Đánh Giá Hải Sản AI</h2>
          <p className="page-header-desc">
            Thử nghiệm quét nhận dạng các loài hải sản ven biển (Cá ngừ, Cá thu, Tôm hùm, Mực lá, Cua biển), tự động vẽ bounding box, đo kích thước, đánh giá chỉ số tươi sống và tự động tính toán đơn giá thị trường.
          </p>
        </div>

        <label className="btn btn-primary cursor-pointer shrink-0">
          <Upload className="w-4 h-4" /> Tải Ảnh Thực Tế
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>

      {/* Main Grid Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">
        
        {/* Left Column: Sample Preset Selector */}
        <div className="lg:col-span-1 glass-panel stack-v">
          <h3 className="section-title">
            <Layers className="w-5 h-5 text-sky-600" /> Chọn Bộ Ảnh Mẫu Thử Nghiệm
          </h3>

          <div className="space-y-3">
            {SEAFOOD_SPECIES.map((spec) => (
              <button
                key={spec.id}
                onClick={() => { setCustomImage(null); setSelectedSpecies(spec); }}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  selectedSpecies.id === spec.id && !customImage
                    ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-200'
                }`}
              >
                <img src={spec.sampleImage} alt={spec.name} className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm">{spec.name}</h4>
                  <p className="text-xs text-slate-500 italic truncate">{spec.scientificName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge badge-cyan">{spec.category}</span>
                    <span className="text-xs text-amber-600 font-mono font-semibold">
                      {Math.round((spec.basePriceMin + spec.basePriceMax)/2).toLocaleString()}đ/kg
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="info-box info-box-sky space-y-1">
            <p className="font-bold">⚙️ Thông số kĩ thuật AI Pipeline:</p>
            <p>• Architecture: YOLOv8 Large Instance Segmentation</p>
            <p>• Input Resolution: 640×640 RGB</p>
            <p>• Inference Speed: ~35ms / image (ONNX Runtime Edge)</p>
          </div>
        </div>

        {/* Center & Right Column: Interactive Canvas & AI Analysis Output */}
        <div className="lg:col-span-2 stack-v">
          
          <div className="glass-panel stack-v">
            
            <div className="flex items-center justify-between section-divider">
              <span className="badge badge-emerald">Phân Tích Khai Thác Thời Gian Thực</span>
              <button
                onClick={() => runAIDetection(selectedSpecies, customImage || selectedSpecies.sampleImage)}
                disabled={isProcessing}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} /> Quét Lại
              </button>
            </div>

            {/* Image Preview & Bounding Box */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[360px] flex items-center justify-center shadow-inner">
              
              <img
                src={customImage || selectedSpecies.sampleImage}
                alt="Seafood AI Scanning"
                className="w-full h-80 object-cover"
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-base font-bold text-sky-300 animate-pulse">
                    Mô hình YOLOv8 đang trích xuất đặc trưng hình ảnh...
                  </span>
                </div>
              )}

              {detectionResult && !isProcessing && (
                <div className="absolute inset-6 border-2 border-emerald-400 bg-emerald-500/10 rounded-xl p-4 flex flex-col justify-between shadow-2xl animate-pulse-glow">
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-emerald-500 text-slate-950 font-extrabold text-sm px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> YOLOv8: {detectionResult.name} ({detectionResult.confidence}%)
                    </span>
                    <span className="bg-slate-900/90 text-emerald-300 font-mono text-sm px-3 py-1.5 rounded-lg border border-emerald-500/40">
                      Chất lượng: {detectionResult.grade}
                    </span>
                  </div>

                  <div className="self-end bg-slate-900/90 p-3 rounded-xl border border-sky-500/40 text-right space-y-0.5">
                    <span className="text-xs text-slate-400 block">Tự động định giá gợi ý AI:</span>
                    <span className="text-lg font-extrabold font-mono text-amber-400">
                      {detectionResult.suggestedPrice.toLocaleString()} VNĐ/kg
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* AI Results Detail Grid */}
            {detectionResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-v">
                
                <div className="glass-card space-y-1.5">
                  <span className="text-slate-500 text-sm block">Độ Tin Cậy Nhận Diện:</span>
                  <span className="text-xl font-bold text-sky-600 font-mono">{detectionResult.confidence}%</span>
                  <p className="text-xs text-slate-500">Đạt ngưỡng Verified xuất khẩu</p>
                </div>

                <div className="glass-card space-y-1.5">
                  <span className="text-slate-500 text-sm block">Độ Tươi (Freshness):</span>
                  <span className="text-xl font-bold text-emerald-600 font-mono">{detectionResult.freshness}%</span>
                  <p className="text-xs text-slate-500">Mắt sáng, da chưa đổi màu</p>
                </div>

                <div className="glass-card space-y-1.5">
                  <span className="text-slate-500 text-sm block">Trọng Lượng Ước Tính:</span>
                  <span className="text-xl font-bold text-amber-600 font-mono">{detectionResult.estimatedWeight} kg/con</span>
                  <p className="text-xs text-slate-500">Phân loại size cá lớn XL</p>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
