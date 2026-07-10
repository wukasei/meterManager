import createApi from './baseApi';

export const getTariffs = async (token, search = '', is_active) => {
  const api = createApi(token);
  const params = {};
  if (search) params.name = search;
  if (is_active !== undefined) params.is_active = is_active;
  const response = await api.get('/tariffs', { params });
  return response.data;
};

export const getTariffById = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/tariffs/${id}`);
  return response.data;
};

export const createTariff = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/tariffs', data);
  return response.data;
};

export const updateTariff = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/tariffs/${id}`, data);
  return response.data;
};

export const deleteTariff = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/tariffs/${id}`);
};
