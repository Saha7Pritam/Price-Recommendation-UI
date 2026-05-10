// src/services/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

export async function fetchRecommendations() {
  const response = await axios.get(`${BASE_URL}/recommendations`);
  return response.data.data;
}