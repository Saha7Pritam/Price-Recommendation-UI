// src/services/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

export async function fetchRecommendations() {
  const response = await axios.get(`${BASE_URL}/recommendations`);
  return response.data.data;
}

// Manual single-product refresh.
// Called when user clicks the refresh icon on a table row.
//
// @param {string} competitorUrl - competitor product page URL to re-scrape
// @param {string} skuId         - our internal SKU_ID
// @returns updated product data { newCompetitorPrice, newRecommendedSP, ... }
export async function refreshProduct(competitorUrl, skuId) {
  const response = await axios.post(`${BASE_URL}/refresh-product`, {
    competitorUrl,
    skuId,
  });
  return response.data;
}