import createApi from './baseApi';

export const getLocations = async (token, search = '') => {
  const api = createApi(token);
  const params = {};
  if (search) params.search = search;
  const response = await api.get('/locations', { params });
  const resp = response.data;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  return [];
};

export const createLocation = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/locations', data);
  return response.data;
};

export const updateLocation = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/locations/${id}`, data);
  return response.data;
};

export const deleteLocation = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/locations/${id}`);
};

export const getLocationDependencies = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/locations/${id}/dependencies`);
  return response.data;
};
