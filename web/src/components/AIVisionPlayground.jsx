import React, { useState, useEffect } from 'react';
import {
  Upload,
  ShieldCheck,
  Layers,
  RefreshCw,
  AlertTriangle,
  ImageIcon
} from 'lucide-react';
import { classifySeafoodImage } from '../api/ai';

const BOX_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6'];

const formatPercent = (confidence) => `${(confidence * 100).toFixed(1)}%`;

// Toạ độ box từ ai-service là pixel ảnh gốc -> đổi sang % để vẽ đè lên ảnh hiển thị
function toBoxStyle(box, width, height, color) {
  return {
    left: `${(box.x1 / width) * 100}%`,
    top: `${(box.y1 / height) * 100}%`,
    width: `${((box.x2 - box.x1) / width) * 100}%`,
    height: `${((box.y2 - box.y1) / height) * 100}%`,
    borderColor: color
  };
}

export default function AIVisionPlayground() {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Giải phóng object URL của ảnh cũ khi đổi ảnh / rời trang
  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  const runDetection = async (file) => {
    setIsProcessing(true);
    setResult(null);
    setError('');
    try {
      setResult(await classifySeafoodImage(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    runDetection(file);
  };

  const detections = result?.detections || [];

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Studio Phân Loại & Đánh Giá Hải Sản AI</h2>
          <p className="page-header-desc">
            Tải ảnh hải sản lên để mô hình YOLOv8 của ai-service nhận dạng loài, đếm số lượng, vẽ khung nhận diện và gợi ý giá tham khảo.
          </p>
        </div>

        <label className="btn btn-primary cursor-pointer shrink-0">
          <Upload className="w-4 h-4" /> Tải Ảnh Thực Tế
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">

        <div className="lg:col-span-2 glass-panel stack-v">
          <div className="flex items-center justify-between section-divider">
            <span className="badge badge-emerald">Kết Quả Nhận Diện</span>
            <button
              onClick={() => runDetection(imageFile)}
              disabled={!imageFile || isProcessing}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} /> Quét Lại
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-90 flex items-center justify-center shadow-inner">
            {imageUrl ? (
              <div className="relative inline-block">
                <img src={imageUrl} alt="Ảnh hải sản cần nhận diện" className="block max-h-120 w-auto" />
                {result && detections.map((det, idx) => {
                  const color = BOX_COLORS[idx % BOX_COLORS.length];
                  return (
                    <div
                      key={idx}
                      className="absolute border-2 rounded-md"
                      style={toBoxStyle(det.box, result.image_width, result.image_height, color)}
                    >
                      <span className="absolute -top-6 left-0 text-xs font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: color }}>
                        {det.label_vi} {formatPercent(det.confidence)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-2 p-6">
                <ImageIcon className="w-12 h-12 mx-auto" />
                <p className="text-sm">Chưa có ảnh. Bấm <strong>Tải Ảnh Thực Tế</strong> để bắt đầu nhận diện.</p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-base font-bold text-sky-300 animate-pulse">Mô hình YOLOv8 đang phân tích ảnh...</span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-600 flex items-center gap-1.5" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="lg:col-span-1 glass-panel stack-v">
          <h3 className="section-title">
            <Layers className="w-5 h-5 text-sky-600" /> Chi Tiết Nhận Diện
          </h3>

          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card space-y-1">
                  <span className="text-slate-500 text-xs block">Số đối tượng</span>
                  <span className="text-xl font-bold text-sky-600 font-mono">{result.count}</span>
                </div>
                <div className="glass-card space-y-1">
                  <span className="text-slate-500 text-xs block">Thời gian xử lý</span>
                  <span className="text-xl font-bold text-emerald-600 font-mono">{Math.round(result.processing_time_ms)} ms</span>
                </div>
              </div>

              {result.needs_review && (
                <div className="info-box text-amber-800 bg-amber-50 border border-amber-200 text-xs flex items-start gap-2" role="status">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>AI chưa đủ chắc chắn về kết quả này. Người dùng cần xác nhận lại hoặc chọn loài thủ công khi đăng bán.</span>
                </div>
              )}

              {detections.length === 0 ? (
                <p className="text-sm text-slate-500">Mô hình không nhận diện được hải sản nào trong ảnh này.</p>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-105 pr-1">
                  {detections.map((det, idx) => (
                    <div key={idx} className="glass-card flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BOX_COLORS[idx % BOX_COLORS.length] }} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{det.label_vi}</h4>
                          {det.species_group && <span className="text-xs text-slate-500 block">Nhóm: {det.species_group}</span>}
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {det.is_uncertain
                              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                            {formatPercent(det.confidence)}{det.is_uncertain && ' • chưa chắc chắn'}
                          </span>
                          {det.variant_confidence != null && (
                            <span className="text-xs text-slate-500 block">Biến thể: {formatPercent(det.variant_confidence)}</span>
                          )}
                        </div>
                      </div>
                      {det.estimated_price_per_kg != null && (
                        <span className="text-sm font-extrabold font-mono text-amber-600 whitespace-nowrap">
                          {det.estimated_price_per_kg.toLocaleString('vi-VN')}đ/kg
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">
                Model: <span className="font-mono">{result.model_version}</span>
                {result.classifier_version && <> + <span className="font-mono">{result.classifier_version}</span></>} • Kích thước ảnh {result.image_width}×{result.image_height}px.
                Giá gợi ý là giá tham khảo, cần đối chiếu giá thị trường thực tế.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Kết quả nhận diện sẽ hiển thị ở đây sau khi tải ảnh lên.</p>
          )}
        </div>

      </div>

    </div>
  );
}
