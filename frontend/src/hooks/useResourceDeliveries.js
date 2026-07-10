import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import * as resourceDeliveriesApi from '../api/resourceDeliveriesApi';
import * as locationApi from '../api/locationsApi';
import * as resourceTypesApi from '../api/resourceTypesApi';
import { useAuthRequest } from './useAuthRequest';
import { useErrorHandler } from './useErrorHandler';

const fetchDeliveries = async (token) => {
  const response = await resourceDeliveriesApi.getResourceDeliveries(token);
  return (response.data || []).map((delivery) => ({
    id: delivery.id,
    location_id: delivery.location_id,
    energy_resource_type_id: delivery.energy_resource_type_id,
    delivery_date: delivery.delivery_date,
    price_per_unit: delivery.price_per_unit,
    locationName: delivery.location?.name,
    resourceTypeName: delivery.energyResourceType?.name,
    deliveryDate: delivery.delivery_date,
    quantity: delivery.quantity,
    unit: delivery.unit,
    pricePerUnit: delivery.price_per_unit,
    totalCost: delivery.total_cost,
    supplier: delivery.supplier,
    createdAt: delivery.created_at,
    updatedAt: delivery.updated_at,
  }));
};

const fetchLocations = async (token) => {
  const locationsArray = await locationApi.getLocations(token);
  return (locationsArray || []).filter((location) => location.is_active);
};

const fetchResourceTypes = async (token) => {
  const response = await resourceTypesApi.getResourceTypes(token);
  return (response.data || []).filter((type) => type.is_active);
};

export const useResourceDeliveries = () => {
  const { canRequest, withToken } = useAuthRequest();
  const { error, setError, handleError } = useErrorHandler('Помилка при завантаженні даних');
  const [search, setSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState(null);
  const [dateToFilter, setDateToFilter] = useState(null);

  const swrKey = canRequest ? ['resourceDeliveries'] : null;

  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    mutate: mutateDeliveries,
  } = useSWR(swrKey, async () => withToken(fetchDeliveries), {
    onError: handleError,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const { data: locations = [], isLoading: locationsLoading } = useSWR(
    canRequest ? ['locations'] : null,
    async () => withToken(fetchLocations),
    {
      onError: (err) => handleError(err, 'Помилка при завантаженні локацій'),
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const { data: resourceTypes = [], isLoading: resourceTypesLoading } = useSWR(
    canRequest ? ['resourceTypes'] : null,
    async () => withToken(fetchResourceTypes),
    {
      onError: (err) => handleError(err, 'Помилка при завантаженні типів ресурсів'),
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const addDelivery = useCallback(
    async (data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        const deliveryData = {
          location_id: data.location_id,
          energy_resource_type_id: data.energy_resource_type_id,
          delivery_date: data.delivery_date,
          quantity: data.quantity,
          unit: data.unit,
          price_per_unit: data.price_per_unit,
          total_cost: data.total_cost,
          supplier: data.supplier,
        };

        const response = await withToken((token) => resourceDeliveriesApi.createResourceDelivery(token, deliveryData));
        mutateDeliveries();
        return response;
      } catch (error) {
        handleError(error, 'Помилка при додаванні поставки');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [withToken, mutateDeliveries, handleError, setError]
  );

  const editDelivery = useCallback(
    async (id, data) => {
      setIsActionLoading(true);
      try {
        setError(null);
        const deliveryData = {
          location_id: data.location_id,
          energy_resource_type_id: data.energy_resource_type_id,
          delivery_date: data.delivery_date,
          quantity: data.quantity,
          unit: data.unit,
          price_per_unit: data.price_per_unit,
          total_cost: data.total_cost,
          supplier: data.supplier,
        };

        const response = await withToken((token) =>
          resourceDeliveriesApi.updateResourceDelivery(token, id, deliveryData)
        );
        mutateDeliveries();
        return response;
      } catch (error) {
        handleError(error, 'Помилка при редагуванні поставки');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [withToken, mutateDeliveries, handleError, setError]
  );

  const removeDelivery = useCallback(
    async (id) => {
      setIsActionLoading(true);
      try {
        setError(null);
        await withToken((token) => resourceDeliveriesApi.deleteResourceDelivery(token, id));
        mutateDeliveries();
      } catch (error) {
        handleError(error, 'Помилка при видаленні поставки');
        throw error;
      } finally {
        setIsActionLoading(false);
      }
    },
    [withToken, mutateDeliveries, handleError, setError]
  );

  const fetchFormData = useCallback(async () => {
    try {
      await Promise.all([mutate('locations'), mutate('resourceTypes')]);
    } catch (err) {
      handleError(err, 'Помилка при завантаженні даних для форми');
    }
  }, [handleError]);

  return {
    deliveries,
    locations,
    resourceTypes,
    loading: deliveriesLoading || locationsLoading || resourceTypesLoading || isActionLoading,
    isActionLoading,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    addDelivery,
    editDelivery,
    removeDelivery,
    fetchFormData,
    error,
    setError,
  };
};
