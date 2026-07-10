import { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import MeterTenantsTable from './MeterTenantsTable';
import MeterTenantForm from './MeterTenantForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useMeterTenants } from '../../hooks/useMeterTenants';
import { useMeters } from '../../hooks/useMeters';
import { useTenants } from '../../hooks/useTenants';
import { useLocations } from '../../hooks/useLocations';
import { useResourceTypes } from '../../hooks/useResourceTypes';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';
import { DEFAULTS, ENTITY_TYPES, DIALOG_ACTIONS } from '../../constants';

const MeterTenantsSection = ({ initialExpanded = true }) => {
  const {
    meterTenants,
    addMeterTenant,
    editMeterTenant,
    removeMeterTenant,
    loading: mtLoading,
    isActionLoading,
    error,
    setError,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    tenantFilter,
    setTenantFilter,
  } = useMeterTenants();

  const { meters, loading: metersLoading } = useMeters();
  const { tenants, loading: tenantsLoading } = useTenants();
  const { locations, loading: locationsLoading } = useLocations();
  const { resourceTypes, loading: typesLoading } = useResourceTypes();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

  const handleServiceError = (err, defaultMessage = UA.error_action_default) => {
    const userMessage = translateErrorMessage(err.message || defaultMessage);
    console.log('usermessage', err.message);
    setSnackbar({ open: true, message: userMessage, severity: 'error' });
    setError(userMessage);
  };

  const handleToggle = () => setExpanded(!expanded);

  const handleAdd = () => {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  };

  const handleEdit = (mt) => {
    setEditing(mt);
    setError(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditing(null);
    setError(null);
  };

  const handleSubmit = async (data) => {
    try {
      if (editing?.id) {
        await editMeterTenant(editing.id, data);
        setSnackbar({ open: true, message: UA.meterTenants_success_updated, severity: 'success' });
      } else {
        await addMeterTenant(data);
        setSnackbar({ open: true, message: UA.meterTenants_success_added, severity: 'success' });
      }
      handleFormClose();
    } catch (err) {
      if (err.type === 'validation' && error.validationErrors?.length > 0) {
        throw err;
      }
      console.log(err);
      handleServiceError(err, UA.error_save_meter_tenant);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await removeMeterTenant(confirmDialog.id);
      setSnackbar({ open: true, message: UA.meterTenants_success_deleted, severity: 'success' });
      handleCloseConfirmDialog();
    } catch (err) {
      handleServiceError(err, UA.error_delete_meter_tenant);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, id: null });
  };

  const handleCloseSnackbar = () => setSnackbar({ open: false, message: '', severity: 'success' });

  const isInitialLoading = mtLoading || metersLoading || tenantsLoading || locationsLoading || typesLoading;

  if (isInitialLoading && meterTenants.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ borderRadius: DEFAULTS.borderRadius, mb: 3 }} elevation={DEFAULTS.paperElevation}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={2}
          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}
          onClick={handleToggle}
        >
          <Typography variant="h5" fontWeight={600}>
            {UA.meterTenants_title} ({meterTenants.length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
        <Divider />
        <Collapse in={expanded} timeout="auto">
          <Box p={3}>
            {isInitialLoading && meterTenants.length === 0 ? (
              <CircularProgress />
            ) : (
              <MeterTenantsTable
                meterTenants={meterTenants}
                tenants={tenants || []}
                meters={meters || []}
                locations={locations || []}
                resourceTypes={resourceTypes || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAdd={handleAdd}
                search={search}
                setSearch={setSearch}
                locationFilter={locationFilter}
                setLocationFilter={setLocationFilter}
                tenantFilter={tenantFilter}
                setTenantFilter={setTenantFilter}
                isLoading={isInitialLoading || isActionLoading}
                setLocalError={setError}
              />
            )}
          </Box>
        </Collapse>
      </Paper>

      <MeterTenantForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={
          editing
            ? {
                tenantId: editing.tenant_id?.toString() || '',
                meterId: editing.meter_id?.toString() || '',
                startDate: editing.assigned_from || '',
                endDate: editing.assigned_to || null,
                id: editing.id,
              }
            : {}
        }
        error={error}
        tenants={tenants.filter((t) => t.isActive)}
        meters={meters.filter((m) => m.isActive)}
        locations={locations.filter((l) => l.isActive)}
        resourceTypes={resourceTypes.filter((rt) => rt.isActive)}
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        action={DIALOG_ACTIONS.delete}
        entity={ENTITY_TYPES.meterTenant}
        dependencies={null}
        isLoading={isActionLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={DEFAULTS.snackbarDuration}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MeterTenantsSection;
