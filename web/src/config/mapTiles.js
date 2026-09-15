// Cấu hình nguồn tile nền bản đồ dùng trong MaritimeMap.jsx.
//
// Lịch sử: ban đầu dùng thẳng {s}.tile.openstreetmap.org, nhưng DNS của một
// số nhà mạng VN (VD: VNPT) trả "Non-existent domain" cho domain này -> bản
// đồ trắng/xám. Thử tạm sang CartoDB Voyager thì lại cần API key (Carto đã
// ngưng cho dùng tile ẩn danh miễn phí) -> hiện chữ "API KEY REQUIRED" đè lên
// bản đồ. Cuối cùng chọn Esri World Street Map — hiện tốt trên mạng VNPT lúc
// test (17/09/2026), KHÔNG cần API key.
//
// Muốn đổi nguồn khác (VD: sau này đồng đội có API key CartoDB), CHỈ CẦN SỬA
// các hằng số bên dưới, không cần đụng vào MaritimeMap.jsx.
//
// Ví dụ đổi sang CartoDB Voyager khi có API key:
//   export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=DAN_KEY_VAO_DAY';
//   export const MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
//   export const MAP_TILE_SUBDOMAINS = 'abcd';

// Hạn chế đã biết: nhãn địa danh tiếng Việt trong ảnh tile của Esri bị mất
// dấu không đồng nhất (VD: "Ho Chi Minh City", "Xa Nhon Thanh Trung" — nhưng
// "Đồng Nai" thì lại có dấu đầy đủ). Đây là do ảnh raster Esri tự vẽ sẵn, code
// không sửa được. Đã cân nhắc đổi sang OpenTopoMap (dữ liệu OSM, khả năng có
// dấu tiếng Việt đầy đủ hơn) nhưng người dùng chọn GIỮ Esri vì đẹp/sạch hơn
// (phong cách giống bản đồ đường phố thương mại) — quyết định ngày 17/09/2026.
//
// Chú ý: Esri dùng thứ tự {z}/{y}/{x} trong URL (khác chuẩn XYZ thường thấy
// {z}/{x}/{y}), đây là cách chính Esri quy định cho dịch vụ REST tile của họ.
export const MAP_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
export const MAP_TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom';
// Esri không dùng kiểu subdomain sharding {s} như OSM/Carto -> để undefined.
export const MAP_TILE_SUBDOMAINS = undefined;
export const MAP_TILE_MAX_ZOOM = 19;
