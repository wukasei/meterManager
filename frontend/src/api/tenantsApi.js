import createApi from './baseApi';

export const getTenants = async (token, search = '') => {
  const api = createApi(token);
  const params = {};
  if (search) params.search = search;
  const response = await api.get('/tenants', { params });
  return response.data;
};

export const createTenant = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/tenants', data);
  return response.data;
};

export const updateTenant = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/tenants/${id}`, data);
  return response.data;
};

export const deleteTenant = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/tenants/${id}`);
};

export const getTenantDependencies = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/tenants/${id}/dependencies`);
  return response.data;
};

export const getSimpleTenants = async (token) => {
  const api = createApi(token);
  const response = await api.get('/tenants/simple');
  return response.data.data;
};
