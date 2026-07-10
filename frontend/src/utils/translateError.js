import { UA } from './uaDictionary';

export const translateErrorMessage = (errorMessage) => {
  const error = String(errorMessage || '');

  if (error.includes('Meter with this serial number already exists')) {
    return UA.error_meter_serial_exists;
  }
  if (error.includes('Meter not found')) {
    return UA.error_meter_not_found;
  }
  if (error.includes('Cannot create meter with inactive location')) {
    return UA.error_meter_inactive_location;
  }
  if (error.includes('Cannot create meter with inactive energy resource type')) {
    return UA.error_meter_inactive_resource;
  }
  if (error.includes('Cannot update meter with inactive location')) {
    return UA.error_meter_update_inactive_location;
  }
  if (error.includes('Cannot update meter with inactive energy resource type')) {
    return UA.error_meter_update_inactive_resource;
  }
  if (error.includes('Cannot delete active meter')) {
    return UA.error_meter_delete_active;
  }

  if (error.includes('This meter is already assigned to the tenant for the given period')){
    return UA.error_already_occupy_meter;
  }

  if (error.includes('Cannot assign inactive meter')) {
    return UA.error_meter_tenant_inactive_meter;
  }
  if (error.includes('Cannot assign meter with inactive location')) {
    return UA.error_meter_tenant_inactive_location;
  }
  if (error.includes('Cannot assign meter with inactive energy resource type')) {
    return UA.error_meter_tenant_inactive_resource;
  }
  if (error.includes('Cannot assign to inactive tenant')) {
    return UA.error_meter_tenant_inactive_tenant;
  }
  if (error.includes('Overlapping meter tenant assignment exists')) {
    return UA.error_meter_tenant_overlapping;
  }
  if (error.includes('Meter tenant assignment not found')) {
    return UA.error_meter_tenant_not_found;
  }

  if (error.includes('Overlapping tariff period exists') || error.includes('Updated period overlaps')) {
    return UA.error_tariff_overlapping;
  }
  if (error.includes('Tariff not found')) {
    return UA.error_tariff_not_found;
  }
  if (error.includes('location is inactive')) {
    return UA.error_tariff_inactive_location;
  }
  if (error.includes('energy resource type is inactive')) {
    return UA.error_tariff_inactive_resource;
  }
  if (error.includes('No applicable tariff found')) {
    return UA.error_tariff_no_applicable;
  }

  if (error.includes('ResourceType with this name already exists')) {
    return UA.error_resource_type_exists;
  }
  if (error.includes('Cannot delete active resource type')) {
    return UA.error_resource_type_delete_active;
  }
  if (error.includes('ResourceType not found') || error.includes('Energy resource type not found')) {
    return UA.error_resource_type_not_found;
  }

  if (error.includes('Location with this name already exists')) {
    return UA.error_location_exists;
  }
  if (error.includes('Cannot delete active location')) {
    return UA.error_location_delete_active;
  }
  if (error.includes('Location not found')) {
    return UA.error_location_not_found;
  }
  if (error.includes('Invalid tenant_id')) {
    return UA.error_tenant_invalid;
  }

  if (error.includes('Tenant with this name already exists')) {
    return UA.error_tenant_exists;
  }
  if (error.includes('Cannot delete active tenant')) {
    return UA.error_tenant_delete_active;
  }
  if (error.includes('Tenant not found')) {
    return UA.error_tenant_not_found;
  }

  if (error.includes('already exists')) {
    return UA.error_already_exists;
  }

  if (error.includes('Failed to fetch') || error.includes('NetworkError')) {
    return UA.error_network;
  }

  return UA.error_unexpected;
};
