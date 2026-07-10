import createApi from './baseApi';

export const verifyUser = async (token) => {
  const api = createApi(token);
  const response = await api.get('/auth/verify-token');
  return response.data;
};
