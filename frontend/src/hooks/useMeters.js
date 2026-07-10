import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import * as metersApi from '../api/metersApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token) => {
  const response = await metersApi.getMeters(token);
  return response.data.map((m) => ({
    ...m,
    isActive: m.is_active,
  }));
};

export const useMeters = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні лічильників');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const swrKey = canRequest ? ['meters'] : null;

  const {
    data: meters = [],
    isLoading: loading,
    mutate: mutateMeters,
  } = useSWR(swrKey, () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    refreshInterval: 30000,
  });

  const activeMeters = useMemo(() => meters.filter((meter) => meter.isActive), [meters]);

  const metersByResourceType = useMemo(
    () =>
      meters.reduce((acc, meter) => {
        const resourceType = meter.energy_resource_type_id || 'other';
        if (!acc[resourceType]) acc[resourceType] = [];
        acc[resourceType].push(meter);
        return acc;
      }, {}),
    [meters]
  );

  const metersByLocation = useMemo(
    () =>
      meters.reduce((acc, meter) => {
        const locationId = meter.location_id || 'other';
        if (!acc[locationId]) acc[locationId] = [];
        acc[locationId].push(meter);
        return acc;
      }, {}),
    [meters]
  );

  const addMeter = useCallback(
    async (data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        const meterData = {
          serial_number: data.serial_number,
          location_id: data.location_id,
          energy_resource_type_id: data.energy_resource_type_id,
          is_active: data.isActive ?? true,
        };
        // const tempId = `temp-${Date.now()}`;
        // const optimisticMeter = {
        //   ...meterData,
        //   id: tempId,
        //   isActive: meterData.is_active,
        //   created_at: new Date().toISOString(),
        //   updated_at: new Date().toISOString(),
        //   isOptimistic: true,
        // };

        //mutateMeters((currentMeters = []) => [...currentMeters, optimisticMeter], false);
        const response = await withToken(metersApi.createMeter, meterData);

        await mutateMeters();
        ['metersTenant', 'locations', 'resourceTypes', 'bills', 'calculations'].forEach((key) => mutate(key));

        return response;
      } catch (error) {
        handleError(error, 'Помилка при додаванні лічильника');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeters, withToken, handleError, setError]
  );

  const editMeter = useCallback(
    async (id, data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        const meterData = {
          serial_number: data.serial_number,
          location_id: data.location_id,
          energy_resource_type_id: data.energy_resource_type_id,
          is_active: data.isActive,
        };

        // mutateMeters(
        //   (currentMeters = []) =>
        //     currentMeters.map((meter) =>
        //       meter.id === id
        //         ? {
        //             ...meter,
        //             ...meterData,
        //             isActive: meterData.is_active,
        //             updated_at: new Date().toISOString(),
        //           }
        //         : meter
        //     ),
        //   false
        // );

        const response = await withToken(metersApi.updateMeter, id, meterData);

        await mutateMeters();
        ['metersTenant', 'bills', 'calculations'].forEach((key) => mutate(key));

        return response;
      } catch (error) {
        handleError(error, 'Помилка при редагуванні лічильника');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeters, withToken, handleError, setError]
  );

  const removeMeter = useCallback(
    async (id) => {
      setIsActionLoading(true);
      try {
        setError(null);
        //mutateMeters((currentMeters = []) => currentMeters.filter((meter) => meter.id !== id), false);

        await withToken(metersApi.deleteMeter, id);

        await mutateMeters();
        ['metersTenant', 'bills', 'payments', 'calculations', 'locations', 'resourceTypes'].forEach((key) =>
          mutate(key)
        );
      } catch (error) {
        handleError(error, 'Помилка при видаленні лічильника');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateMeters, withToken, handleError, setError]
  );

  const updateMeterStatus = useCallback(
    async (id, isActive) => {
      const currentMeter = meters.find((m) => m.id === id);
      if (!currentMeter) throw new Error('Лічильник не знайдено для оновлення статусу');

      setIsActionLoading(true);
      try {
        setError(null);
        mutateMeters(
          (currentMeters = []) =>
            currentMeters.map((m) =>
              m.id === id
                ? {
                    ...m,
                    isActive: isActive,
                    is_active: isActive,
                    updated_at: new Date().toISOString(),
                  }
                : m
            ),
          false
        );

        const response = await withToken(metersApi.updateMeter, id, { is_active: isActive });

        await mutateMeters();
        ['metersTenant', 'bills'].forEach((key) => mutate(key));

        return response;
      } catch (error) {
        mutateMeters();
        handleError(error, 'Помилка при оновленні статусу лічильника');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [meters, mutateMeters, withToken, handleError, setError]
  );

  const refreshMeters = useCallback(() => {
    mutateMeters();
  }, [mutateMeters]);

  const getMeterDependencies = useCallback(
    async (id) => {
      try {
        const response = await withToken(metersApi.getMeterDependencies, id);
        return {
          active: response.data?.active_readings > 0 || response.data?.active_assignments > 0,
          details: response.data,
        };
      } catch (err) {
        handleError(err, 'Помилка при отриманні залежностей лічильника');
        throw err;
      }
    },
    [withToken, handleError]
  );

  // const getMetersByLocation = useCallback(
  //   (locationId) => meters.filter((meter) => meter.location_id === locationId),
  //   [meters]
  // );
  // const getMetersByResourceType = useCallback(
  //   (resourceTypeId) => meters.filter((meter) => meter.energy_resource_type_id === resourceTypeId),
  //   [meters]
  // );

  // const getActiveMetersByLocation = useCallback(
  //   (locationId) => activeMeters.filter((meter) => meter.location_id === locationId),
  //   [activeMeters]
  // );
  // const getActiveMetersByResourceType = useCallback(
  //   (resourceTypeId) => activeMeters.filter((meter) => meter.energy_resource_type_id === resourceTypeId),
  //   [activeMeters]
  // );

  // const isAvailableForAssignment = useCallback(
  //   (meterId) => {
  //     const meter = meters.find((m) => m.id === meterId);
  //     return meter && meter.isActive;
  //   },
  //   [meters]
  // );

  return {
    meters,
    activeMeters,
    metersByResourceType,
    metersByLocation,
    loading: loading || isActionLoading,
    isActionLoading,
    search,
    setSearch,
    addMeter,
    editMeter,
    removeMeter,
    updateMeterStatus,
    refreshMeters,
    getMeterDependencies,
    error,
    setError,
  };
};
