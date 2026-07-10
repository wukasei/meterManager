import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import * as usersApi from '../api/userApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token, search = '') => {
  const response = await usersApi.getUsers(token, search);
  return (response.data || []).map((u) => ({ ...u, isActive: u.is_active }));
};

export const useUsers = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні користувачів');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const swrKey = canRequest ? ['users'] : null;

  const {
    data: users = [],
    isLoading: loadingSWR,
    mutate: mutateUsers,
  } = useSWR(swrKey, async () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const updateUserStatus = useCallback(
    async (id, isActive) => {
      setIsActionLoading(true);
      try {
        setError(null);
        mutateUsers(
          (currentUsers = []) => currentUsers.map((u) => (u.id === id ? { ...u, isActive, is_active: isActive } : u)),
          false
        );
        await withToken(usersApi.updateUser, id, { is_active: isActive });
        await mutateUsers();
      } catch (err) {
        mutateUsers();
        handleError(err, 'Помилка при оновленні статусу користувача');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [withToken, mutateUsers, handleError, setError]
  );

  const loading = loadingSWR || isActionLoading;

  return {
    users,
    loading,
    isActionLoading,
    search,
    setSearch,
    updateUserStatus,
    error,
    setError,
    refreshUsers: mutateUsers,
  };
};
