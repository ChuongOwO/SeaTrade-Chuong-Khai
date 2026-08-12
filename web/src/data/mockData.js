// Mock Dataset & Initial State for SeaTrade AI Platform

export const SEAFOOD_SPECIES = [
  {
    id: 'tun-yellowfin',
    name: 'Cá Ngừ Vây Vàng',
    scientificName: 'Thunnus albacares',
    category: 'Fish',
    basePriceMin: 150000,
    basePriceMax: 220000,
    unit: 'kg',
    description: 'Cá ngừ vây vàng đại dương tươi nguyên con, thịt đỏ tươi chắc, phù hợp làm Sashimi và xuất khẩu.',
    sampleImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    grades: [
      { grade: 'Grade A (Tươi Sống / Cấp Đông Lập Tức)', multiplier: 1.25, criteria: 'Mắt trong, mang đỏ hồng, độ đàn hồi cao' },
      { grade: 'Grade B (Tươi Ướp Đá Trôi)', multiplier: 1.0, criteria: 'Mắt hơi đục nhẹ, mang đỏ thẫm' },
      { grade: 'Grade C (Tiêu Thụ Nội Địa / Chế Biến)', multiplier: 0.75, criteria: 'Mềm nhẹ, dùng làm chả/đóng hộp' }
    ]
  },
  {
    id: 'mac-spanish',
    name: 'Cá Thu Thuận Hải',
    scientificName: 'Scomberomorus commerson',
    category: 'Fish',
    basePriceMin: 180000,
    basePriceMax: 240000,
    unit: 'kg',
    description: 'Cá thu tươi nguyên con vừa đánh bắt, thân dẹp lóng lánh ánh bạc, thịt ngọt đậm đà.',
    sampleImage: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
    grades: [
      { grade: 'Size XL (>4kg/con)', multiplier: 1.2, criteria: 'Cá lớn, lạt thịt dày, đạt chuẩn nhà hàng' },
      { grade: 'Size L (2-4kg/con)', multiplier: 1.0, criteria: 'Kích thước tiêu chuẩn thị trường' },
      { grade: 'Size M (<2kg/con)', multiplier: 0.85, criteria: 'Cá thu nhở' }
    ]
  },
  {
    id: 'shp-lobster-tiger',
    name: 'Tôm Hùm Bông / Tôm Hùm Đá',
    scientificName: 'Panulirus ornatus',
    category: 'Shrimp',
    basePriceMin: 950000,
    basePriceMax: 1400000,
    unit: 'kg',
    description: 'Tôm hùm bông thiên nhiên đánh bắt rạn bãi ven đảo, vỏ rực rỡ, thịt săn dai đặc sản.',
    sampleImage: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    grades: [
      { grade: 'Size A (>1.2kg/con)', multiplier: 1.3, criteria: 'Tôm sống bơi khỏe, vỏ bóng đẹp' },
      { grade: 'Size B (0.7-1.2kg/con)', multiplier: 1.0, criteria: 'Tôm sống khỏe tiêu chuẩn' },
      { grade: 'Size C (<0.7kg/con)', multiplier: 0.8, criteria: 'Tôm nhỏ' }
    ]
  },
  {
    id: 'squ-broad-squid',
    name: 'Mực Lá Đại Dương',
    scientificName: 'Sepioteuthis lessoniana',
    category: 'Squid',
    basePriceMin: 220000,
    basePriceMax: 310000,
    unit: 'kg',
    description: 'Mực lá thân dày, da đổi màu chớp nháy khi vừa kéo lưới, giòn ngọt hảo hạng.',
    sampleImage: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    grades: [
      { grade: 'Mi nhon mi nơ (Đang sống)', multiplier: 1.2, criteria: 'Da nhấp nháy ánh sao, thịt trong suốt' },
      { grade: 'Tươi ướp đá tầng 1', multiplier: 1.0, criteria: 'Thân trắng mịn, chưa lột da' }
    ]
  },
  {
    id: 'crb-camau',
    name: 'Cua Biển Cà Mau / Cua Gạch',
    scientificName: 'Scylla serrata',
    category: 'Crab',
    basePriceMin: 350000,
    basePriceMax: 550000,
    unit: 'kg',
    description: 'Cua gạch và cua thịt đánh bắt vùng bãi bồi cửa sông ven biển, chắc thịt gạch béo ngậy.',
    sampleImage: 'https://images.unsplash.com/photo-1559742811-822863c46f43?auto=format&fit=crop&w=600&q=80',
    grades: [
      { grade: 'Cua Gạch Đặc Biệt', multiplier: 1.25, criteria: 'Gạch lấp đầy 100% mai, Yếm chắc' },
      { grade: 'Cua Thịt Y7 ( >700g/con)', multiplier: 1.0, criteria: 'Thịt 90-95% độ đầy' }
    ]
  }
];

export const INITIAL_VESSELS = [
  {
    id: 'vessel-01',
    code: 'BV-98234-TS',
    name: 'Tàu Hải Nam 09',
    type: 'fishing', // fishing boat
    captain: 'Nguyễn Văn Hùng',
    phone: '0912.345.678',
    homePort: 'Cảng Cá Cát Lở, Vũng Tàu',
    lat: 10.3245,
    lng: 107.1240,
    heading: 145,
    speedKnots: 8.5,
    status: 'ACTIVE_FISHING',
    powerHP: 450,
    activePostId: 'post-101',
    fuelPercent: 82,
    batteryPercent: 95
  },
  {
    id: 'vessel-02',
    code: 'BV-91022-TS',
    name: 'Tàu Biển Đông 02',
    type: 'fishing',
    captain: 'Trần Đình Nam',
    phone: '0988.765.432',
    homePort: 'Cảng Cá Vũng Tàu',
    lat: 10.2810,
    lng: 107.1950,
    heading: 90,
    speedKnots: 4.2,
    status: 'ACTIVE_FISHING',
    powerHP: 600,
    activePostId: 'post-102',
    fuelPercent: 68,
    batteryPercent: 88
  },
  {
    id: 'vessel-03',
    code: 'KG-94811-TS',
    name: 'Tàu Phú Quốc King',
    type: 'fishing',
    captain: 'Lê Hoàng Long',
    phone: '0939.112.233',
    homePort: 'Cảng An Thới, Phú Quốc',
    lat: 10.1980,
    lng: 107.0520,
    heading: 210,
    speedKnots: 0.5,
    status: 'ANCHORED_HAULING',
    powerHP: 520,
    activePostId: 'post-103',
    fuelPercent: 74,
    batteryPercent: 92
  },
  {
    id: 'vessel-04',
    code: 'TG-88219-TG',
    name: 'Tàu Thu Gom Sông Tiền 01',
    type: 'collector', // buyer / collector vessel
    captain: 'Phạm Quốc Cường',
    phone: '0903.998.877',
    homePort: 'Cảng Cá Gành Hào',
    lat: 10.3510,
    lng: 107.0810,
    heading: 160,
    speedKnots: 11.2,
    status: 'PATROLLING_BUYING',
    powerHP: 850,
    coldStorageCapacityTons: 25,
    currentLoadTons: 6.4
  },
  {
    id: 'vessel-05',
    code: 'TG-99014-TG',
    name: 'Tàu Thu Mua Hải Phát 88',
    type: 'collector',
    captain: 'Vũ Đức Thịnh',
    phone: '0977.443.322',
    homePort: 'Cảng Cá Lộc An',
    lat: 10.2500,
    lng: 107.1400,
    heading: 280,
    speedKnots: 9.0,
    status: 'PATROLLING_BUYING',
    powerHP: 750,
    coldStorageCapacityTons: 30,
    currentLoadTons: 12.8
  }
];

export const INITIAL_POSTS = [
  {
    id: 'post-101',
    vesselId: 'vessel-01',
    vesselCode: 'BV-98234-TS',
    vesselName: 'Tàu Hải Nam 09',
    captain: 'Nguyễn Văn Hùng',
    phone: '0912.345.678',
    speciesId: 'tun-yellowfin',
    speciesName: 'Cá Ngừ Vây Vàng',
    category: 'Fish',
    estimatedQuantityKg: 450,
    aiGrade: 'Grade A (Tươi Sống / Ướp Đá Nhanh)',
    aiFreshnessScore: 96.5,
    aiConfidenceScore: 98.4,
    aiSuggestedPricePerKg: 185000,
    askingPricePerKg: 190000,
    totalValue: 85500000, // 450 * 190000
    lat: 10.3245,
    lng: 107.1240,
    catchTimestamp: '2026-08-11 08:30',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    status: 'OPEN', // OPEN, IN_NEGOTIATION, LOCKED, DELIVERED
    distanceNauticalMiles: 2.8,
    offersCount: 2
  },
  {
    id: 'post-102',
    vesselId: 'vessel-02',
    vesselCode: 'BV-91022-TS',
    vesselName: 'Tàu Biển Đông 02',
    captain: 'Trần Đình Nam',
    phone: '0988.765.432',
    speciesId: 'mac-spanish',
    speciesName: 'Cá Thu Thuận Hải',
    category: 'Fish',
    estimatedQuantityKg: 320,
    aiGrade: 'Size XL (>4kg/con)',
    aiFreshnessScore: 94.2,
    aiConfidenceScore: 97.1,
    aiSuggestedPricePerKg: 215000,
    askingPricePerKg: 220000,
    totalValue: 70400000,
    lat: 10.2810,
    lng: 107.1950,
    catchTimestamp: '2026-08-11 09:15',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
    status: 'IN_NEGOTIATION',
    distanceNauticalMiles: 7.4,
    offersCount: 4
  },
  {
    id: 'post-103',
    vesselId: 'vessel-03',
    vesselCode: 'KG-94811-TS',
    vesselName: 'Tàu Phú Quốc King',
    captain: 'Lê Hoàng Long',
    phone: '0939.112.233',
    speciesId: 'shp-lobster-tiger',
    speciesName: 'Tôm Hùm Bông',
    category: 'Shrimp',
    estimatedQuantityKg: 85,
    aiGrade: 'Size A (Tôm Sống >1.2kg)',
    aiFreshnessScore: 99.1,
    aiConfidenceScore: 99.0,
    aiSuggestedPricePerKg: 1250000,
    askingPricePerKg: 1280000,
    totalValue: 108800000,
    lat: 10.1980,
    lng: 107.0520,
    catchTimestamp: '2026-08-11 07:45',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    status: 'OPEN',
    distanceNauticalMiles: 9.6,
    offersCount: 1
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-2026-0891',
    postId: 'post-99',
    sellerVesselCode: 'BV-98234-TS',
    sellerName: 'Tàu Hải Nam 09',
    buyerVesselCode: 'TG-88219-TG',
    buyerName: 'Tàu Thu Gom Sông Tiền 01',
    buyerCaptain: 'Phạm Quốc Cường',
    speciesName: 'Mực Lá Đại Dương',
    quantityKg: 280,
    agreedPricePerKg: 260000,
    totalAmount: 72800000,
    dealLocationLat: 10.3120,
    dealLocationLng: 107.1100,
    status: 'COMPLETED', // IN_TRANSIT, COMPLETED, CANCELLED
    timestamp: '2026-08-10 16:40',
    rating: 5,
    review: 'Hải sản rất tươi sống, da mực chớp nháy đúng như AI phân tích. Giao dịch chuẩn tọa độ GPS.'
  },
  {
    id: 'ORD-2026-0892',
    postId: 'post-100',
    sellerVesselCode: 'BV-91022-TS',
    sellerName: 'Tàu Biển Đông 02',
    buyerVesselCode: 'TG-99014-TG',
    buyerName: 'Tàu Thu Mua Hải Phát 88',
    buyerCaptain: 'Vũ Đức Thịnh',
    speciesName: 'Cua Biển Cà Mau',
    quantityKg: 150,
    agreedPricePerKg: 480000,
    totalAmount: 72000000,
    dealLocationLat: 10.2650,
    dealLocationLng: 107.1550,
    status: 'IN_TRANSIT',
    timestamp: '2026-08-11 10:10',
    rating: null,
    review: null
  }
];

export const MARKET_PRICE_INDEX = [
  { species: 'Cá Ngừ Vây Vàng', avgPrice: 185000, change: '+4.2%', trend: 'UP', gradeA: 215000, gradeB: 180000 },
  { species: 'Cá Thu Thuận Hải', avgPrice: 210000, change: '+1.5%', trend: 'UP', gradeA: 235000, gradeB: 195000 },
  { species: 'Tôm Hùm Bông', avgPrice: 1250000, change: '-2.1%', trend: 'DOWN', gradeA: 1380000, gradeB: 1150000 },
  { species: 'Mực Lá Đại Dương', avgPrice: 265000, change: '+6.8%', trend: 'UP', gradeA: 295000, gradeB: 240000 },
  { species: 'Cua Biển Cà Mau', avgPrice: 460000, change: '0.0%', trend: 'STABLE', gradeA: 520000, gradeB: 420000 }
];
