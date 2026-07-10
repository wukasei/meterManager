import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import * as meterTenantsApi from '../api/meterTenantsApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token) => {
  const response = await meterTenantsApi.getAllMeterTenants(token);
  return (response.data || []).map((mt) => ({
    ...mt,
    tenantName: mt.Tenant?.name,
    meterSerialNumber: mt.Meter?.serial_number,
    locationId: mt.Meter?.location_id,
  }));
};

export const useMeterTenants = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні призначень лічильників');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const swrKey = canRequest ? ['metersTenant'] : null;

  const {
    data: meterTenants = [],
    isLoading: loadingSWR,
    mutate: mutateMeterTenants,
  } = useSWR(swrKey, async () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const getAllMeterTenants = useCallback(
    async (token) => {
      try {
        const response = await meterTenantsApi.getAllMeterTenants(token);
        return response;
      } catch (err) {
        handleError(err, 'Помилка при завантаженні списку лічильників');
        throw err;
      }
    },
    [handleError]
  );

  const addMeterTenant = useCallback(
    async (data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        // const tempId = `temp-${Date.now()}`;
        // const optimistic = {
        //   ...data,
        //   id: tempId,
        //   isOptimistic: true,
        // };
        // mutateMeterTenants((currentData = []) => [...currentData, optimistic], false);

        const response = await withToken(meterTenantsApi.createMeterTenant, data);

        await mutateMeterTenants();
        ['meters', 'tenants'].forEach((key) => mutate(key));

        return response;
      } catch (err) {
        handleError(err, 'Помилка при додаванні призначення лічильника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeterTenants, withToken, handleError, setError]
  );

  const editMeterTenant = useCallback(
    async (id, data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        // mutateMeterTenants(
        //   (currentData = []) => currentData.map((mt) => (mt.id === id ? { ...mt, ...data } : mt)),
        //   false
        // );

        const response = await withToken(meterTenantsApi.updateMeterTenant, id, data);
        await mutateMeterTenants();
        ['meters', 'tenants'].forEach((key) => mutate(key));

        return response;
      } catch (err) {
        handleError(err, 'Помилка при редагуванні призначення лічильника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeterTenants, withToken, handleError, setError]
  );

  const removeMeterTenant = useCallback(
    async (id) => {
      setIsActionLoading(true);
      try {
        setError(null);
        //mutateMeterTenants((currentData = []) => currentData.filter((mt) => mt.id !== id), false);
        await withToken(meterTenantsApi.deleteMeterTenant, id);
        await mutateMeterTenants();
        ['meters', 'tenants'].forEach((key) => mutate(key));
      } catch (err) {
        handleError(err, 'Помилка при видаленні призначення лічильника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeterTenants, withToken, handleError, setError]
  );

  const refreshMeterTenants = useCallback(() => {
    mutateMeterTenants();
  }, [mutateMeterTenants]);

  const loading = loadingSWR || isActionLoading;

  return {
    meterTenants,
    loading,
    isActionLoading,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    tenantFilter,
    setTenantFilter,
    addMeterTenant,
    editMeterTenant,
    removeMeterTenant,
    refreshMeterTenants,
    getAllMeterTenants,
    error,
    setError,
  };
};
