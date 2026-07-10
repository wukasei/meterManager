import createApi from './baseApi';

export const getResourceDeliveries = async (token, filters = {}) => {
  const api = createApi(token);
  const response = await api.get('/resource-deliveries', { params: filters });
  return response.data;
};

export const createResourceDelivery = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/resource-deliveries', data);
  return response.data;
};

export const updateResourceDelivery = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/resource-deliveries/${id}`, data);
  return response.data;
};

export const deleteResourceDelivery = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/resource-deliveries/${id}`);
};
