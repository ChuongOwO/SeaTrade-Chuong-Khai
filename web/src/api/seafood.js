import { apiFetch } from './client';

// Chợ hải sản: các mẻ cá đang AVAILABLE kèm tàu, chủ tàu, loài và giá chào bán
// (back-end/src/modules/seafood/batch.service.js -> getMarketBatches).
export async function fetchMarketBatches() {
  const res = await apiFetch('/api/seafood/batches/market');
  return res.metadata || [];
}

// Danh mục loài hải sản (back-end/src/modules/seafood/species.routes.js)
export async function fetchSpecies(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, val]) => val !== undefined && val !== '')
  );
  const q = params.toString();
  const res = await apiFetch(`/api/seafood/species${q ? `?${q}` : ''}`);
  return res.metadata || [];
}

export async function createSpecies(data) {
  const res = await apiFetch('/api/seafood/species', {
    method: 'POST',
    body: data
  });
  return res.metadata;
}

export async function updateSpecies(id, data) {
  const res = await apiFetch(`/api/seafood/species/${id}`, {
    method: 'PUT',
    body: data
  });
  return res.metadata;
}

export async function deleteSpecies(id) {
  const res = await apiFetch(`/api/seafood/species/${id}`, {
    method: 'DELETE'
  });
  return res.metadata;
}
