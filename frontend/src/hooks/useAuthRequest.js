import { useMemo, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

export const useAuthRequest = () => {
  const { isAuthenticated, isLoading, getToken, isBlocked } = useAuthContext();

  const canRequest = useMemo(
    () => isAuthenticated && !isLoading && !isBlocked,
    [isAuthenticated, isLoading, isBlocked]
  );

  const withToken = useCallback(
    async (apiCall, ...args) => {
      if (!canRequest) throw new Error('Unauthorized');
      const token = await getToken();
      if (!token) throw new Error('No token available');
      return apiCall(token, ...args);
    },
    [canRequest, getToken]
  );

  return { canRequest, withToken };
};
