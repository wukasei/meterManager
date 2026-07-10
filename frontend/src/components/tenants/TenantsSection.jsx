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
import TenantsTable from '../tenants/TenantsTable';
import TenantForm from '../tenants/TenantForm';
import { useTenants } from '../../hooks/useTenants';
import { useLocations } from '../../hooks/useLocations';
import { translateErrorMessage } from '../../utils/translateError';
import ConfirmDialog from '../ui/ConfirmDialog';
import { UA } from '../../utils/uaDictionary';
import { DEFAULTS } from '../../constants';
import { useTheme } from '@mui/material/styles';

const TenantsSection = ({ initialExpanded = true }) => {
  const theme = useTheme();
  const {
    tenants,
    search,
    setSearch,
    addTenant,
    editTenant,
    removeTenant,
    updateTenantStatus,
    getTenantDependencies,
    error,
    setError,
    loading: tenantsLoading,
    isActionLoading,
  } = useTenants();

  const { locations, loading: locationsLoading, error: locationsError } = useLocations();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [locationFilter, setLocationFilter] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, action: null, dependencies: null });

  const handleServiceError = (err, defaultMessage = null) => {
    const userMessage = translateErrorMessage(err.message || defaultMessage || UA.error_action_default);
    setSnackbar({ open: true, message: userMessage, severity: 'error' });
    setError(userMessage);
  };

  const handleToggle = () => setExpanded(!expanded);

  const handleAdd = () => {
    setEditingTenant(null);
    setError(null);
    setFormOpen(true);
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingTenant?.id) {
        await editTenant(editingTenant.id, data);
        setSnackbar({ open: true, message: UA.tenants_success_updated, severity: 'success' });
      } else {
        await addTenant(data);
        setSnackbar({ open: true, message: UA.tenants_success_added, severity: 'success' });
      }
      setFormOpen(false);
      setEditingTenant(null);
      setError(null);
    } catch (err) {
      if (err.type === 'validation') {
        throw err; // important
      }

      handleServiceError(err, UA.error_save_tenant);
    }
    //finally {
    //  setIsActionLoading(false);
    //}
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTenant(null);
    setError(null);
  };

  const handleRemove = async (id) => {
    try {
      const dependencies = await getTenantDependencies(id);

      const hasDependencies = dependencies.active_meter_tenants > 0;

      setConfirmDialog({
        open: true,
        id,
        action: 'delete',
        dependencies: hasDependencies ? dependencies : null,
      });
    } catch (err) {
      handleServiceError(err, UA.error_check_dependencies);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await removeTenant(confirmDialog.id);
      setSnackbar({ open: true, message: UA.tenants_success_deleted, severity: 'success' });
      handleCloseConfirmDialog();
    } catch (err) {
      handleServiceError(err, UA.error_delete_tenant);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, id: null, action: null, dependencies: null });
  };

  const handleStatusUpdate = async (id, statusData) => {
    try {
      await updateTenantStatus(id, statusData);
      setSnackbar({ open: true, message: UA.tenants_success_status, severity: 'success' });
    } catch (err) {
      handleServiceError(err, UA.error_update_status);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  const isLoading = tenantsLoading || locationsLoading;

  if (locationsError)
    return (
      <Typography color="error">
        {UA.locations_load_error}: {locationsError.message}
      </Typography>
    );

  if (isLoading && tenants.length === 0) return <CircularProgress />;

  return (
    <>
      <Paper
        sx={{
          mb: 2.5,
          borderRadius: 1.5,
          overflow: 'hidden',
        }}
        elevation={2}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2.5}
          py={1.75}
          sx={{
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            },
          }}
          onClick={handleToggle}
        >
          <Typography variant="h6" fontWeight={600} fontSize="1.125rem">
            {UA.tenants_title} ({tenants.length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
        <Divider />
        <Collapse in={expanded} timeout="auto">
          <Box px={2.5} py={2.5}>
            <TenantsTable
              tenants={tenants}
              search={search}
              setSearch={setSearch}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              locations={locations}
              onAdd={handleAdd}
              onEdit={handleEdit}
              removeTenant={handleRemove}
              updateTenantStatus={handleStatusUpdate}
              getTenantDependencies={getTenantDependencies}
              setLocalError={setError}
              isLoading={isLoading || isActionLoading}
            />
          </Box>
        </Collapse>
      </Paper>

      <TenantForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={editingTenant || {}}
        error={error}
        tenants={tenants}
        locations={locations.filter((l) => l.isActive)}
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        action={confirmDialog.action}
        entity="tenant"
        dependencies={confirmDialog.dependencies}
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

export default TenantsSection;
