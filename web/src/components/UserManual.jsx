import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  Anchor, 
  Camera, 
  FileText
} from 'lucide-react';

export default function UserManual() {
  // Tạo và tải về bản Markdown của hướng dẫn sử dụng (nội dung khớp với
  // các mục hiển thị bên dưới, thay vì chỉ alert() báo giả một file có sẵn)
  const handleDownloadManual = () => {
    const content = `# Hướng Dẫn Sử Dụng & Vận Hành Hệ Thống SeaTrade AI

## 1. Tổng Quan Kiến Trúc Nền Tảng

Hệ thống là giải pháp số hóa mô hình giao thương hải sản trực tiếp ngoài khơi
giữa bên bán (Tàu đánh bắt/Ngư dân) và bên mua (Tàu thu gom/Thương lái).

- **Web Admin Dashboard**: ReactJS + Vite. Giám sát hoạt động giao dịch, quản lý
  danh mục hải sản, biến động giá thị trường và đội tàu.
- **Mobile App (Simulator)**: Đa vai trò (Thuyền trưởng & Thương lái). Tích hợp
  quét ảnh AI, bản đồ hải trình GPS, thỏa thuận đơn hàng & Offline Sync.
- **Mô-đun AI Computer Vision**: Phân loại chủng loại hải sản, đánh giá độ tươi
  và gợi ý giá.

## 2. Quy Trình Dành Cho Thuyền Trưởng Tàu Đánh Bắt (Bên Bán)

1. Bật định vị GPS, chọn chế độ "Thuyền Trưởng Tàu Đánh Bắt".
2. Chụp ảnh quét AI khi vừa trúng mẻ lưới để nhận diện loài, đánh giá độ tươi
   và gợi ý mức giá.
3. Nhập sản lượng dự kiến và nhấn "Phát Sóng Rao Bán".
4. Thỏa thuận & chốt đơn với tàu thu gom.
5. Di chuyển giao nhận theo chỉ dẫn hải trình GPS.

## 3. Quy Trình Dành Cho Tàu Thu Gom / Thương Lái (Bên Mua)

1. Mở bản đồ rada hải trình để xem các tàu đánh bắt đang có hải sản gần đó.
2. Lọc và xem chi tiết mặt hàng đã verified bằng AI.
3. Gửi đề nghị mua và chốt đơn.
4. Điều hướng GPS theo tọa độ biển đến vị trí giao hàng.

## 4. Hướng Dẫn Cài Đặt & Chạy Mã Nguồn

\`\`\`
# 1. Web Dashboard & Mobile Simulator
cd web
npm install
npm run dev

# 2. AI Service (Python FastAPI + YOLOv8)
cd ai-service
pip install -r requirements.txt
python main.py
\`\`\`

---
Tài liệu được tạo tự động từ trang Hướng Dẫn của ứng dụng.
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HUONG_DAN_SU_DUNG.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-section max-w-none w-full">
      
      <div className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="page-header-title">Hướng Dẫn Sử Dụng & Vận Hành Hệ Thống</h2>
          <p className="page-header-desc">
            Tài liệu chi tiết hướng dẫn vận hành nền tảng giao thương hải sản ven biển kết hợp mô-đun phân loại AI và bản đồ hải trình GPS.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadManual}
          className="btn btn-outline shrink-0"
        >
          <FileText className="w-4 h-4" /> Tải HUONG_DAN_SU_DUNG.md
        </button>
      </div>

      {/* Guide Content Sections */}
      <div className="stack-v">
        
        {/* Section 1: Tổng Quan Kiến Trúc */}
        <div className="glass-panel space-y-4">
          <h3 className="section-title">
            <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm flex items-center justify-center font-mono font-bold">1</span>
            Tổng Quan Kiến Trúc Nền Tảng SeaTrade AI
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            Hệ thống là giải pháp số hóa toàn diện mô hình giao thương hải sản trực tiếp ngoài khơi giữa bên bán (Tàu đánh bắt/Ngư dân) và bên mua (Tàu thu gom/Thương lái/Chợ đầu mối).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-v pt-1">
            <div className="glass-card space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" /> Web Admin Dashboard
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Xây dựng bằng ReactJS + Vite. Giám sát toàn bộ hoạt động giao dịch, quản lý danh mục hải sản, biến động giá thị trường và fleet tàu thuyền.
              </p>
            </div>

            <div className="glass-card space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Anchor className="w-4 h-4 text-sky-600" /> Mobile App (Simulator)
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Đa vai trò (Thuyền trưởng & Thương lái). Tích hợp camera chụp ảnh quét AI, bản đồ hải trình GPS, thỏa thuận đơn hàng & Offline Sync.
              </p>
            </div>

            <div className="glass-card space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" /> Mô-Đun AI Computer Vision
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ứng dụng YOLOv8 & OpenCV tự động phân loại chủng loại (Cá ngừ, Cá thu, Tôm hùm, Mực, Cua), đánh giá độ tươi và tự động gợi ý giá.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Quy Trình Dành Cho Ngư Dân */}
        <div className="glass-panel space-y-4">
          <h3 className="section-title">
            <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm flex items-center justify-center font-mono font-bold">2</span>
            Quy Trình Dành Cho Thuyền Trưởng Tàu Đánh Bắt (Bên Bán)
          </h3>

          <ol className="list-decimal list-inside space-y-3 pl-1 text-sm text-slate-700 leading-relaxed">
            <li>
              <strong className="text-slate-900">Bật Định Vị GPS:</strong> Đăng nhập ứng dụng di động, chọn chế độ "Thuyền Trưởng Tàu Đánh Bắt" để hệ thống phát sóng tọa độ vị trí thực ngoài khơi.
            </li>
            <li>
              <strong className="text-slate-900">Chụp Ảnh Quét AI Hải Sản:</strong> Khi vừa trúng mẻ lưới, mở tab "Quét AI", chụp ảnh hải sản. AI YOLOv8 sẽ tự động nhận diện tên loài, đánh giá độ tươi (Grade A) và gợi ý mức giá thị trường.
            </li>
            <li>
              <strong className="text-slate-900">Tạo Bài Đăng Rao Bán:</strong> Nhập sản lượng dự kiến (kg/tấn), kiểm tra thông số pre-filled từ AI và nhấn "Phát Sóng Rao Bán".
            </li>
            <li>
              <strong className="text-slate-900">Thỏa Thuận & Chốt Đơn:</strong> Nhận thông báo mua từ các tàu thu gom xung quanh, thỏa thuận mức giá final và bấm "Xác Nhận Chốt Đơn".
            </li>
            <li>
              <strong className="text-slate-900">Di Chuyển Giao Nhận:</strong> Xem mũi tên hướng dẫn hải trình chỉ đường GPS để di chuyển 2 tàu lại gần nhau tiến hành bàn giao hải sản.
            </li>
          </ol>
        </div>

        {/* Section 3: Quy Trình Dành Cho Thương Lái */}
        <div className="glass-panel space-y-4">
          <h3 className="section-title">
            <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm flex items-center justify-center font-mono font-bold">3</span>
            Quy Trình Dành Cho Tàu Thu Gom / Thương Lái (Bên Mua)
          </h3>

          <ol className="list-decimal list-inside space-y-3 pl-1 text-sm text-slate-700 leading-relaxed">
            <li>
              <strong className="text-slate-900">Mở Bản Đồ Rada Hải Trình:</strong> Chuyển vai trò sang "Tàu Thu Gom / Thương Lái", ứng dụng sẽ quét và hiển thị danh sách các tàu đánh bắt đang có hải sản trong bán kính 5 - 15 hải lý.
            </li>
            <li>
              <strong className="text-slate-900">Lọc & Xem Chi Tiết Mặt Hàng:</strong> Lọc theo loại hải sản mong muốn, khoảng cách hoặc đơn giá. Click bài rao để kiểm tra ảnh chụp đã verified bằng AI.
            </li>
            <li>
              <strong className="text-slate-900">Gửi Đề Nghị Mua & Chốt Đơn:</strong> Nhập giá thỏa thuận và gửi đề nghị cho thuyền trưởng tàu đánh bắt.
            </li>
            <li>
              <strong className="text-slate-900">Điều Hướng GPS Theo Tọa Độ Biển:</strong> Sau khi đơn được chốt, màn hình ứng dụng hiển thị khoảng cách hải lý (NM), thời gian dự kiến (ETA) và vector chỉ đường GPS để tàu thu gom di chuyển đến vị trí giao hàng.
            </li>
          </ol>
        </div>

        {/* Section 4: Hướng Dẫn Cài Đặt */}
        <div className="glass-panel space-y-4">
          <h3 className="section-title">
            <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm flex items-center justify-center font-mono font-bold">4</span>
            Hướng Dẫn Cài Đặt & Chạy Mã Nguồn Đồ Án
          </h3>

          <div className="bg-slate-900 p-5 rounded-xl font-mono text-sm text-sky-300 space-y-2 border border-slate-700 leading-relaxed">
            <p className="text-slate-400"># 1. Khởi chạy giao diện Web Dashboard & Mobile Simulator:</p>
            <p className="text-white">cd f:\Do-an-tot-nghiep\web</p>
            <p className="text-white">npm install</p>
            <p className="text-white">npm run dev</p>
            <p className="text-slate-400 pt-2"># Trình duyệt sẽ tự động mở địa chỉ http://localhost:3000</p>
            
            <p className="text-slate-400 pt-3"># 2. Khởi chạy mô-đun AI Service (Python FastAPI + YOLOv8):</p>
            <p className="text-white">cd f:\Do-an-tot-nghiep\ai-service</p>
            <p className="text-white">pip install -r requirements.txt</p>
            <p className="text-white">python main.py</p>
          </div>
        </div>

      </div>

    </div>
  );
}
