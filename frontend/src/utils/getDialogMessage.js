import { pluralize } from './Pluralize';
import { UA } from './uaDictionary';

export const getDialogMessage = (action, dependencies, entity = 'location') => {
  if (entity === 'resourceType' && action === 'delete') {
    return UA.confirm_delete_resource_type;
  }
  if (entity === 'delivery' && action === 'delete') {
    return UA.confirm_delete_delivery;
  }
  if (entity === 'tariff' && action === 'delete') {
    return UA.confirm_delete_tariff;
  }
  if (entity === 'meter' && action === 'delete') {
    const meterTenantCount = dependencies?.active_meter_tenants || 0;
    if (meterTenantCount > 0) {
      const tenantText = `${meterTenantCount} ${pluralize(meterTenantCount, UA.confirm_active_meter_tenants, UA.confirm_active_meter_tenants_plural, UA.confirm_active_meter_tenants_genitive)}`;
      return `${UA.confirm_delete_meter_with_tenants} ${tenantText}. ${UA.confirm_irreversible}`;
    } else {
      return UA.confirm_delete_meter;
    }
  }

  const parts = [];
  const meterDependencyKey = entity === 'location' ? 'active_meters' : null;
  if (meterDependencyKey && dependencies?.[meterDependencyKey]) {
    parts.push(
      `${dependencies[meterDependencyKey]} ${pluralize(dependencies[meterDependencyKey], UA.confirm_active_meters, UA.confirm_active_meters_plural, UA.confirm_active_meters_genitive)}`
    );
  }

  if (entity === 'location' && dependencies?.deliveries) {
    parts.push(
      `${dependencies.deliveries} ${pluralize(dependencies.deliveries, UA.confirm_deliveries, UA.confirm_deliveries_plural, UA.confirm_deliveries_genitive)}`
    );
  }
  if (entity === 'location' && dependencies?.active_tenants) {
    parts.push(
      `${dependencies.active_tenants} ${pluralize(dependencies.active_tenants, UA.confirm_active_tenants, UA.confirm_active_tenants_plural, UA.confirm_active_tenants_plural)}`
    );
  }

  if (parts.length === 0 && entity === 'location') {
    if (action === 'delete') {
      return UA.confirm_delete_location;
    } else {
      return UA.confirm_deactivate_location;
    }
  } else if (parts.length > 0 && entity === 'location') {
    const itemsText = parts.join(', ');
    if (action === 'delete') {
      return `${UA.confirm_delete_location_with_deps}: ${itemsText}. ${UA.confirm_irreversible}`;
    } else {
      return `${UA.confirm_deactivate_location_with_deps}: ${itemsText}.`;
    }
  }

  if (action === 'delete') {
    return UA.confirm_delete_generic;
  } else {
    return UA.confirm_deactivate_generic;
  }
};
