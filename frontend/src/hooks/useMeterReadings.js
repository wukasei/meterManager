import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import * as meterReadingsApi from '../api/meterReadings';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetcher = async (token) => {
  const response = await meterReadingsApi.getMeterReadings(token);
  return response.data || [];
};

export const useMeterReadings = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні показників');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const swrKey = canRequest ? ['meterReadings'] : null;

  const {
    data: meterReadings = [],
    isLoading: loading,
    mutate: mutateReadings,
  } = useSWR(swrKey, () => withToken(fetcher), {
    onError: handleError,
    revalidateOnFocus: false,
  });

  const addReading = useCallback(
    async (newReading) => {
      try {
        setError(null);
        setIsActionLoading(true);
        // const tempId = Date.now();
        // const optimisticReading = { ...newReading, id: tempId, isOptimistic: true };
        // mutateReadings([...meterReadings, optimisticReading], false);

        await withToken(meterReadingsApi.createMeterReading, newReading);
        await mutateReadings();
        mutate('meters');
      } catch (err) {
        handleError(err, 'Помилка при додаванні показника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateReadings, withToken, handleError, setError]
  );

  const editReading = useCallback(
    async (id, updatedReading) => {
      try {
        setError(null);
        setIsActionLoading(true);
        // const updatedList = meterReadings.map((r) => (r.id === id ? { ...r, ...updatedReading } : r));
        // mutateReadings(updatedList, false);

        await withToken(meterReadingsApi.updateMeterReading, id, updatedReading);
        await mutateReadings();
        mutate('meters');
      } catch (err) {
        handleError(err, 'Помилка при редагуванні показника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateReadings, withToken, handleError, setError]
  );

  const removeReading = useCallback(
    async (id) => {
      try {
        setError(null);
        setIsActionLoading(true);
        // const filteredList = meterReadings.filter((r) => r.id !== id);
        // mutateReadings(filteredList, false);

        await withToken(meterReadingsApi.deleteMeterReading, id);
        await mutateReadings();
        mutate('meters');
      } catch (err) {
        handleError(err, 'Помилка при видаленні показника');
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [mutateReadings, withToken, handleError, setError]
  );

  const fetchReadings = useCallback(() => {
    mutateReadings();
  }, [mutateReadings]);

  const getReadingsSummary = useCallback(
    async (filters = {}) => {
      try {
        const response = await withToken(meterReadingsApi.getMeterReadingsSummary, filters);
        return response.data;
      } catch (err) {
        handleError(err, 'Помилка при отриманні зведених даних');
        throw err;
      }
    },
    [withToken, handleError, setError]
  );

  return {
    meterReadings,
    loading: loading || isActionLoading,
    error,
    setError,
    fetchReadings,
    addReading,
    editReading,
    removeReading,
    getReadingsSummary,
  };
};
