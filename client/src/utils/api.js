import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export async function fetchRent(zip) {
  const { data } = await api.get(`/rentcast/rent/${zip}`);
  return data;
}

export async function fetchWalkScore(neighborhoodId) {
  const { data } = await api.get('/walkscore/score', { params: { neighborhoodId } });
  return data;
}

export async function fetchCityComparison() {
  const { data } = await api.get('/teleport/compare');
  return data;
}

export async function fetchVerdict(payload) {
  const { data } = await api.post('/claude/verdict', payload);
  return data;
}

export async function fetchChecklist(payload) {
  const { data } = await api.post('/claude/checklist', payload);
  return data;
}

export async function fetchFurnitureList(payload) {
  const { data } = await api.post('/claude/furniture', payload);
  return data;
}

export async function fetchListings(zip, city) {
  const { data } = await api.get('/rentcast/listings', { params: { zip, city } });
  return data;
}

export async function fetchNeighborhoodReviews(neighborhood) {
  const { data } = await api.get('/insights/reviews', { params: { neighborhood } });
  return data;
}
