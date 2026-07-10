import axios from 'axios';

const createApi = (token) => {
  // TODO get and check token here
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // If no response → network error
      if (!error.response) {
        error.type = 'network';
        error.message = 'Ne  twork error';
        return Promise.reject(error);
      }

      const { status, data } = error.response;

      // Validation detection (generic)
      if ((status === 400 || status === 422 ||  status === 409) && data && typeof data === 'object') {
        error.type = 'validation';
        error.validationErrors = data.errors || null;
        error.message = data.message || 'Validation failed';
        return Promise.reject(error);
      }

      // Unauthorized
      if (status === 401) {
        error.type = 'unauthorized';
        error.message = data?.message || 'Unauthorized';
        return Promise.reject(error);
      }

      // Forbidden
      if (status === 403) {
        error.type = 'forbidden';
        error.message = data?.message || 'Access denied';
        return Promise.reject(error);
      }

      // Generic server error
      error.type = 'error';
      error.message = data?.message || 'Server error';

      return Promise.reject(error);
    }
  );

  return api;
};

export default createApi;
