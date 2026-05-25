// src/services/api.js
import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL;

const BASE_URL = `${BASE}/api`;
const AUTH_URL = `${BASE}/auth`;

export async function fetchRecommendations() {
  const response = await axios.get(`${BASE_URL}/recommendations`,
    { withCredentials: true });
  return response.data.data;
}

export async function refreshProduct(competitorUrl, skuId) {
  const response = await axios.post(`${BASE_URL}/refresh-product`,
    { competitorUrl, skuId },
    { withCredentials: true }
  );
  return response.data;
}

export async function checkAuth() {
  try {
    const res = await axios.get(`${AUTH_URL}/me`,
      { withCredentials: true });
    return res.data;
  } catch {
    return { authenticated: false };
  }
}

export async function logout() {
  await axios.post(`${AUTH_URL}/logout`, {},
    { withCredentials: true });
}

export async function fetchCompetitorDetails(skuId) {
  const response = await axios.get(`${BASE_URL}/competitor-details/${encodeURIComponent(skuId)}`,
    { withCredentials: true }
  );
  return response.data.data; // array of { CompetitorPrice, ProductURL, StoreName, StockStatus }
}


export async function fetchPPProducts() {
  const response = await axios.get(`${BASE_URL}/pp-products`,
    { withCredentials: true }
  );
  return response.data.data;
}
 
export async function updatePP(skuId, newPP) {
  const response = await axios.patch(`${BASE_URL}/update-pp`,
    { skuId, newPP },
    { withCredentials: true }
  );
  return response.data.data; // { SKU_ID, PP, ManualPP_UpdatedAt, ManualPP_UpdatedBy, LastBillDate }
}
 