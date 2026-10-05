import { apiFetch } from './client';

// Chợ hải sản: các mẻ cá đang AVAILABLE kèm tàu, chủ tàu, loài và giá chào bán
// (back-end/src/modules/seafood/batch.service.js -> getMarketBatches).
export async function fetchMarketBatches() {
  const res = await apiFetch('/api/seafood/batches/market');
  return res.metadata || [];
}
