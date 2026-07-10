import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import * as locationApi from '../api/locationsApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

export const useLocations = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні локацій');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetcher = useCallback(async () => {
    const data = await withToken(locationApi.getLocations);
    return (data || []).map((loc) => ({
      ...loc,
      isActive: loc.is_active === true,
      tenant: loc.Tenant || null,
    }));
  }, [withToken]);

  const swrKey = canRequest ? ['locations', null] : null;

  const {
    data: locations = [],
    isLoading: loading,
    mutate: mutateLocations,
  } = useSWR(swrKey, fetcher, {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const activeLocations = useMemo(() => locations.filter((loc) => loc.isActive), [locations]);

  const addLocation = useCallback(
    async (data) => {
      try {
        setIsActionLoading(true);
        setError(null);

        const transformedData = {
          name: data.name,
          address: data.address,
          is_active: data.isActive ?? true,
          occupied_area: data.occupied_area,
          tenant_id: data.tenant_id ?? null,
        };

        // const tempId = `temp-${Date.now()}`;
        // const optimisticLocation = {
        //   id: tempId,
        //   name: transformedData.name,
        //   address: transformedData.address,
        //   isActive: transformedData.is_active,
        //   occupied_area: transformedData.occupied_area,
        //   tenant: data.tenant_id ? { id: data.tenant_id, name: data.tenantName || '...' } : null,
        //   isOptimistic: true,
        // };

        // mutateLocations((prev = []) => [...prev, optimisticLocation], false);

        const response = await withToken(locationApi.createLocation, transformedData);

        await mutateLocations();
        mutate('meters');
        mutate('tenants');
        mutate('deliveries');

        return response;
      } catch (err) {
        mutateLocations();
        handleError(err, 'Помилка при додаванні локації');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateLocations, withToken, handleError, setError]
  );

  const editLocation = useCallback(
    async (id, data) => {
      try {
        setIsActionLoading(true);
        setError(null);

        const transformedData = {
          name: data.name,
          address: data.address,
          is_active: data.isActive,
          occupied_area: data.occupied_area,
          tenant_id: data.tenant_id ?? null,
        };

        // const updatedLocations = locations.map((loc) =>
        //   loc.id === id
        //     ? {
        //         ...loc,
        //         name: transformedData.name,
        //         address: transformedData.address,
        //         isActive: transformedData.is_active,
        //         occupied_area: transformedData.occupied_area,
        //         tenant: transformedData.tenant_id
        //           ? { id: transformedData.tenant_id, name: data.tenantName || loc.tenant?.name }
        //           : null,
        //       }
        //     : loc
        // );
        // mutateLocations(updatedLocations, false);

        const response = await withToken(locationApi.updateLocation, id, transformedData);

        await mutateLocations();
        if (transformedData.is_active === false) {
          mutate('meters');
          mutate('tenants');
        }

        return response;
      } catch (err) {
        handleError(err, 'Помилка при редагуванні локації');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateLocations, withToken, setError, handleError]
  );

  const removeLocation = useCallback(
    async (id) => {
      try {
        setIsActionLoading(true);
        setError(null);
        await withToken(locationApi.deleteLocation, id);
        mutateLocations();
        mutate('meters');
        mutate('tenants');
        mutate('deliveries');
      } catch (err) {
        handleError(err, 'Помилка при видаленні локації');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateLocations, withToken, handleError, setError]
  );

  const updateLocationStatus = useCallback(
    async (id, is_active, force = false) => {
      const loc = locations.find((l) => l.id === id);
      if (!loc) throw new Error('Локацію не знайдено');
      try {
        setError(null);
        if (!is_active && !force) {
          const dependencies = await withToken(locationApi.getLocationDependencies, id);
          const hasDependencies = dependencies.data.active_meters > 0 || dependencies.data.active_tenants > 0;
          if (hasDependencies) {
            return {
              requiresConfirmation: true,
              dependencies: dependencies.data,
            };
          }
        }
        const payload = { name: loc.name, address: loc.address, is_active };
        const updatedLocations = locations.map((location) =>
          location.id === id ? { ...location, isActive: is_active } : location
        );
        mutateLocations(updatedLocations, false);

        const response = await withToken(locationApi.updateLocation, id, payload);

        mutateLocations();
        if (!is_active) {
          mutate('meters');
          mutate('tenants');
        }

        return {
          requiresConfirmation: false,
          data: response,
        };
      } catch (err) {
        mutateLocations();
        handleError(err, 'Помилка при оновленні статусу локації');
        throw err;
      }
    },
    [locations, mutateLocations, withToken, handleError, setError]
  );

  const getDependencies = useCallback(
    async (id) => {
      try {
        setError(null);
        const response = await withToken(locationApi.getLocationDependencies, id);
        return response.data;
      } catch (err) {
        handleError(err, 'Помилка при отриманні залежностей локації');
        throw err;
      }
    },
    [withToken, handleError, setError]
  );

  const refreshLocations = useCallback(() => {
    mutateLocations();
  }, [mutateLocations]);

  return {
    locations,
    activeLocations,
    loading: loading || isActionLoading,
    addLocation,
    editLocation,
    removeLocation,
    updateLocationStatus,
    refreshLocations,
    getDependencies,
    error,
    setError,
  };
};
