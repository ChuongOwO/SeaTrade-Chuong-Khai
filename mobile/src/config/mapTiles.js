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

// ---------------------------------------------------------------------------
// Các lớp nền để người dùng tự chuyển trên bản đồ (nút ở góc trên bên phải, trong WebView).
// Tất cả đều miễn phí, không cần API key. Mỗi lớp nền gồm 1 hoặc nhiều "tiles"
// xếp chồng (VD: ảnh vệ tinh + lớp nhãn địa danh). Đổi/thêm lớp chỉ cần sửa
// danh sách này, không đụng vào MaritimeMap.jsx.
//
// Lưu ý: nguồn Esri/OpenSeaMap lấy từ tài liệu công khai của họ, nếu 1 lớp
// không tải được (mạng nhà mạng chặn) thì chỉ lớp đó trắng, các lớp khác vẫn dùng bình thường.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri';

export const MAP_BASE_LAYERS = [
  {
    id: 'street',
    name: 'Đường phố',
    tiles: [{ url: MAP_TILE_URL, attribution: MAP_TILE_ATTRIBUTION, maxZoom: MAP_TILE_MAX_ZOOM }],
  },
  {
    id: 'satellite',
    name: 'Vệ tinh',
    tiles: [
      { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, attribution: `${ESRI_ATTRIBUTION} &mdash; Maxar, Earthstar Geographics`, maxZoom: 19 },
      // Nhãn địa danh/đường ranh giới phủ lên ảnh vệ tinh
      { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, attribution: '', maxZoom: 19 },
    ],
  },
  {
    id: 'ocean',
    name: 'Hải đồ',
    tiles: [
      // Hải đồ Ocean của Esri chỉ có sẵn ảnh đến mức zoom 13; zoom cao hơn Leaflet phóng to ảnh mức 13
      { url: `${ESRI}/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}`, attribution: `${ESRI_ATTRIBUTION} &mdash; GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org`, maxZoom: 18, maxNativeZoom: 13 },
      { url: `${ESRI}/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}`, attribution: '', maxZoom: 18, maxNativeZoom: 13 },
    ],
  },
];

// Lớp phủ tùy chọn (tick bật/tắt): phao tiêu, đèn biển, luồng hàng hải... do cộng đồng OpenSeaMap đóng góp.
export const MAP_SEAMARK_OVERLAY = {
  id: 'seamark',
  name: 'Ký hiệu hàng hải (OpenSeaMap)',
  url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  attribution: 'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
  maxZoom: 18,
};
