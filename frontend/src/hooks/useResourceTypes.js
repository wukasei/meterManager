import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import * as resourceTypeApi from '../api/resourceTypesApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token = '') => {
  const response = await resourceTypeApi.getResourceTypes(token);
  return (response.data || []).map((type) => ({
    ...type,
    isActive: type.is_active === true,
  }));
};

export const useResourceTypes = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні типів ресурсів');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const swrKey = canRequest ? ['resourceTypes'] : null;

  const {
    data: resourceTypes = [],
    isLoading: loading,
    mutate: mutateResourceTypes,
  } = useSWR(swrKey, async () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const activeResourceTypes = useMemo(() => resourceTypes.filter((t) => t.isActive), [resourceTypes]);

  const addResourceType = useCallback(
    async (data) => {
      try {
        setError(null);
        setIsActionLoading(true);
        const transformedData = { name: data.name, unit: data.unit, is_active: data.isActive ?? true };
        // const tempId = Date.now();
        // const optimistic = {
        //   id: tempId,
        //   ...transformedData,
        //   isActive: transformedData.is_active,
        //   isOptimistic: true,
        // };
        // mutateResourceTypes([...resourceTypes, optimistic], false);
        const response = await withToken(resourceTypeApi.createResourceType, transformedData);
        await mutateResourceTypes();
        mutate('meters');
        mutate('resources');
        mutate('deliveries');
        mutate('metersTenant');
        mutate('resourceDeliveries');
        return response;
      } catch (err) {
        handleError(err, 'Помилка при додаванні типу ресурсу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateResourceTypes, withToken, handleError, setError]
  );

  const editResourceType = useCallback(
    async (id, data) => {
      try {
        setError(null);
        setIsActionLoading(true);
        const transformedData = { name: data.name, unit: data.unit, is_active: data.isActive };
        // mutateResourceTypes(
        //   resourceTypes.map((t) =>
        //     t.id === id ? { ...t, ...transformedData, isActive: transformedData.is_active } : t
        //   ),
        //   false
        // );
        const response = await withToken(resourceTypeApi.updateResourceType, id, transformedData);
        await mutateResourceTypes();
        mutate('meters');
        mutate('resources');
        mutate('deliveries');
        return response;
      } catch (err) {
        handleError(err, 'Помилка при редагуванні типу ресурсу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateResourceTypes, withToken, handleError, setError]
  );

  const removeResourceType = useCallback(
    async (id) => {
      try {
        setError(null);
        setIsActionLoading(true);
        // mutateResourceTypes(
        //   resourceTypes.filter((t) => t.id !== id),
        //   false
        // );
        await withToken(resourceTypeApi.deleteResourceType, id);
        await mutateResourceTypes();
        mutate('meters');
        mutate('resources');
        mutate('deliveries');
        mutate('metersTenant');
        mutate('resourceDeliveries');
      } catch (err) {
        handleError(err, 'Помилка при видаленні типу ресурсу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateResourceTypes, withToken, handleError, setError]
  );

  const updateResourceTypeStatus = useCallback(
    async (id, is_active) => {
      const type = resourceTypes.find((t) => t.id === id);
      if (!type) throw new Error('Тип ресурсу не знайдено');
      try {
        setError(null);
        setIsActionLoading(true);
        const payload = { ...type, is_active };
        mutateResourceTypes(
          resourceTypes.map((t) => (t.id === id ? { ...t, isActive: is_active } : t)),
          false
        );
        await withToken(resourceTypeApi.updateResourceType, id, payload);
        mutate('meters');
        mutate('resources');
      } catch (err) {
        mutateResourceTypes();
        handleError(err, 'Помилка при оновленні статусу типу ресурсу');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [resourceTypes, mutateResourceTypes, withToken, handleError, setError]
  );

  return {
    resourceTypes,
    activeResourceTypes,
    loading,
    search,
    setSearch,
    addResourceType,
    editResourceType,
    removeResourceType,
    updateResourceTypeStatus,
    refreshResourceTypes: mutateResourceTypes,
    error,
    setError,
    isActionLoading,
  };
};
