import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import * as tariffApi from '../api/tariffApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token) => {
  const response = await tariffApi.getTariffs(token);
  return (response.data || []).map((t) => ({ ...t, isActive: t.is_active === true }));
};

export const useTariffs = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні тарифів');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  const swrKey = canRequest ? ['tariffs'] : null;

  const {
    data: tariffs = [],
    isLoading: loading,
    mutate: mutateTariffs,
  } = useSWR(swrKey, async () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const activeTariffs = useMemo(() => tariffs.filter((t) => t.isActive), [tariffs]);
  const tariffsByResourceType = useMemo(
    () =>
      tariffs.reduce((acc, t) => {
        const type = t.energy_resource_type_id || 'other';
        acc[type] = acc[type] || [];
        acc[type].push(t);
        return acc;
      }, {}),
    [tariffs]
  );

  const addTariff = useCallback(
    async (payload) => {
      setIsActionLoading(true);
      try {
        setError(null);
        // const tempId = Date.now();
        // const optimisticTariff = { ...payload, id: tempId, isActive: true, isOptimistic: true }; // Assume new tariffs are active

        // mutateTariffs([...tariffs, optimisticTariff], false);
        const response = await withToken(tariffApi.createTariff, payload);

        await mutateTariffs();
        ['deliveries', 'resourceDeliveries', 'bills', 'payments', 'calculations', 'meters'].forEach(mutate);

        return response;
      } catch (err) {
        handleError(err, 'Помилка при додаванні тарифу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateTariffs, withToken, handleError, setError]
  );

  const editTariff = useCallback(
    async (id, payload) => {
      setIsActionLoading(true);
      try {
        setError(null);
        // mutateTariffs(
        //   tariffs.map((t) => (t.id === id ? { ...t, ...payload, isActive: t.isActive } : t)), // Keep original isActive status during optimistic update
        //   false
        // );

        const response = await withToken(tariffApi.updateTariff, id, payload);
        await mutateTariffs();
        ['deliveries', 'resourceDeliveries', 'bills', 'payments', 'calculations'].forEach(mutate);

        return response;
      } catch (err) {
        handleError(err, 'Помилка при редагуванні тарифу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateTariffs, withToken, handleError, setError]
  );

  const removeTariff = useCallback(
    async (id) => {
      setIsActionLoading(true);
      try {
        setError(null);
        // mutateTariffs(
        //   tariffs.filter((t) => t.id !== id),
        //   false
        // );
        await withToken(tariffApi.deleteTariff, id);
        await mutateTariffs();
        ['deliveries', 'resourceDeliveries', 'bills', 'payments', 'calculations', 'meters'].forEach(mutate);
      } catch (err) {
        handleError(err, 'Помилка при видаленні тарифу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateTariffs, withToken, handleError, setError]
  );

  return {
    tariffs,
    activeTariffs,
    tariffsByResourceType,
    loading: loading || isActionLoading,
    isActionLoading,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    addTariff,
    editTariff,
    removeTariff,
    refreshTariffs: mutateTariffs,
    error,
    setError,
  };
};
