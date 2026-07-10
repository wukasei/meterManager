import createApi from './baseApi';

export const getAllMeterTenants = async (token, filters = {}) => {
  const api = createApi(token);
  const response = await api.get('/meter-tenants', { params: filters });
  return response.data;
};

export const getMeterTenantById = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/meter-tenants/${id}`);
  return response.data;
};

export const createMeterTenant = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/meter-tenants', data);
  return response.data;
};

export const updateMeterTenant = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/meter-tenants/${id}`, data);
  return response.data;
};

export const deleteMeterTenant = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/meter-tenants/${id}`);
};
