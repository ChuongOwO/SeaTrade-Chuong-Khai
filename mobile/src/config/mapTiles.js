// Cấu hình nguồn tile nền bản đồ dùng trong components/LeafletMap.js (WebView).
// Xem đầy đủ lịch sử/lý do chọn ở web/src/config/mapTiles.js (2 bên tách file
// riêng vì mobile và web là 2 dự án độc lập, không share code trực tiếp).
//
// Muốn đổi nguồn khác, CHỈ CẦN SỬA các hằng số bên dưới, không cần đụng vào
// LeafletMap.js.

// Hạn chế đã biết + quyết định giữ Esri dù mất dấu 1 số tên địa danh tiếng
// Việt: xem ghi chú đầy đủ ở web/src/config/mapTiles.js.
//
// Chú ý: Esri dùng thứ tự {z}/{y}/{x} trong URL (khác chuẩn XYZ thường thấy
// {z}/{x}/{y}) — đây là quy định của chính dịch vụ REST tile của Esri.
export const MAP_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
export const MAP_TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (HK), Esri (Thailand), TomTom';
// Esri không dùng kiểu subdomain sharding {s} như OSM/Carto -> để null.
export const MAP_TILE_SUBDOMAINS = null;
export const MAP_TILE_MAX_ZOOM = 19;
