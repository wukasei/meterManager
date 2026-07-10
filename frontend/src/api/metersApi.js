import createApi from './baseApi';

export const getMeters = async (token, search = '') => {
  const api = createApi(token);
  const params = {};

  if (search && search.trim()) {
    params.search = search.trim();
  }

  const response = await api.get('/meters', { params });
  return response.data;
};

export const getMeterById = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/meters/${id}`);
  return response.data;
};

export const createMeter = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/meters', data);
  return response.data;
};

export const updateMeter = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/meters/${id}`, data);
  return response.data;
};

export const deleteMeter = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/meters/${id}`);
};

export const getMeterDependencies = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/meters/${id}/dependencies`);
  return response.data;
};
