import createApi from './baseApi';

export const getResourceTypes = async (token, search = '', is_active) => {
  const api = createApi(token);
  const params = {};
  if (search) params.name = search;
  if (is_active !== undefined) params.is_active = is_active;
  const response = await api.get('/resource-types', { params });
  return response.data;
};

export const getResourceTypeById = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/resource-types/${id}`);
  return response.data;
};

export const createResourceType = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/resource-types', data);
  return response.data;
};

export const updateResourceType = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/resource-types/${id}`, data);
  return response.data;
};

export const deleteResourceType = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/resource-types/${id}`);
};

export const getResourceTypeDependencies = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/resource-types/${id}/dependencies`);
  return response.data;
};
