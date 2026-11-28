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

// ---------------------------------------------------------------------------
// Các lớp nền để người dùng tự chuyển trên bản đồ (nút ở góc trên bên phải).
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
