import createApi from './baseApi';

export const createMeterReading = async (token, data) => {
  const api = createApi(token);
  const response = await api.post('/meter-readings', data);
  return response.data;
};

export const getMeterReadings = async (token, params = {}) => {
  const api = createApi(token);
  const response = await api.get('/meter-readings', { params });
  return response.data;
};

export const getMeterReadingById = async (token, id) => {
  const api = createApi(token);
  const response = await api.get(`/meter-readings/${id}`);
  return response.data;
};

export const updateMeterReading = async (token, id, data) => {
  const api = createApi(token);
  const response = await api.put(`/meter-readings/${id}`, data);
  return response.data;
};

export const deleteMeterReading = async (token, id) => {
  const api = createApi(token);
  await api.delete(`/meter-readings/${id}`);
};
export const getMeterReadingsSummary = async (token, filters = {}) => {
  const api = createApi(token);
  const response = await api.get('/meter-readings/summary', { params: filters });
  return response.data;
};
