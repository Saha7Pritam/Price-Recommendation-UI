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
 

// ── Download blank CSV template ───────────────────────────────
// Triggers a file download in the browser.
// The server returns a CSV with just the headers: SKU,PP
export async function downloadPPTemplate() {
  const response = await axios.get(`${BASE_URL}/pp-template-csv`, {
    withCredentials: true,
    responseType: 'blob',   // important — treat response as binary
  });
 
  // Create a temporary anchor and trigger download
  const url      = window.URL.createObjectURL(new Blob([response.data]));
  const link     = document.createElement('a');
  link.href      = url;
  link.setAttribute('download', 'pp_update_template.csv');
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}
 







// ── Validate SKUs — now returns currentPP per matched SKU ─────
export async function validateBulkPP(skus) {
  const response = await axios.post(`${BASE_URL}/validate-skus`,
    { skus },
    { withCredentials: true }
  );
  // Returns: { valid: [{ sku, currentPP }], notFound: string[] }
  return response.data;
}
 
// ── Submit bulk PP update — now sends unidentified rows too ───
// rows:         [{ skuId, newPP }]
// unidentified: [{ sku, pp }]
// fileName:     string
export async function bulkUpdatePP(rows, unidentified = [], fileName = '') {
  const response = await axios.post(`${BASE_URL}/bulk-update-pp`,
    { rows, unidentified, fileName },
    { withCredentials: true }
  );
  return response.data.data;
  // Returns: { sessionId, updated, unidentifiedCount, updatedBy, updatedAt }
}
 
// ── Fetch bulk upload history ─────────────────────────────────
export async function fetchBulkUploadHistory() {
  const response = await axios.get(`${BASE_URL}/bulk-upload-history`,
    { withCredentials: true }
  );
  return response.data.data;
}
 
// ── Fetch unidentified SKUs for a session ─────────────────────
export async function fetchSessionUnidentified(sessionId) {
  const response = await axios.get(
    `${BASE_URL}/bulk-upload-session/${sessionId}/unidentified`,
    { withCredentials: true }
  );
  return response.data.data;
}
 
// ── Export unidentified SKUs as CSV download ──────────────────
export async function exportSessionUnidentified(sessionId) {
  const response = await axios.get(
    `${BASE_URL}/bulk-upload-session/${sessionId}/export`,
    { withCredentials: true, responseType: 'blob' }
  );
  const url  = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', `unidentified_skus_${sessionId.slice(0, 8)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}
