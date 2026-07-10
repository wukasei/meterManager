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
import ResourceTypesTable from '../resourceTypes/ResourceTypesTable';
import ResourceTypeForm from '../resourceTypes/ResourceTypeForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useResourceTypes } from '../../hooks/useResourceTypes';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';
import { DEFAULTS } from '../../constants';
import { useTheme } from '@mui/material/styles';

const ResourceTypesSection = ({ initialExpanded = true }) => {
  const theme = useTheme();
  const {
    resourceTypes,
    search,
    setSearch,
    addResourceType,
    editResourceType,
    removeResourceType,
    updateResourceTypeStatus,
    error,
    setError,
    loading,
    isActionLoading,
  } = useResourceTypes();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResourceType, setEditingResourceType] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, action: null, dependencies: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleServiceError = (err, defaultMessage = null) => {
    const userMessage = translateErrorMessage(err.message || defaultMessage || UA.error_action_default);
    setSnackbar({ open: true, message: userMessage, severity: 'error' });
    setError(userMessage);
  };

  const handleToggle = () => setExpanded(!expanded);

  const handleAdd = () => {
    setEditingResourceType(null);
    setError(null);
    setFormOpen(true);
  };

  const handleEdit = (resourceType) => {
    setEditingResourceType(resourceType);
    setError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingResourceType?.id) {
        await editResourceType(editingResourceType.id, formData);
        setSnackbar({ open: true, message: UA.resourceTypes_success_updated, severity: 'success' });
      } else {
        await addResourceType(formData);
        setSnackbar({ open: true, message: UA.resourceTypes_success_created, severity: 'success' });
      }
    } catch (err) {
      handleServiceError(err, UA.error_save_resource_type);
    } finally {
      setFormOpen(false);
      setEditingResourceType(null);
      setError(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingResourceType(null);
    setError(null);
  };

  const handleRemove = (id) => {
    setConfirmDialog({
      open: true,
      id,
      action: 'delete',
      dependencies: null,
    });
  };

  const handleUpdateStatus = async (id, isActive) => {
    try {
      await updateResourceTypeStatus(id, isActive);
      setSnackbar({
        open: true,
        message: `${UA.resourceTypes_success_status} ${isActive ? UA.status_activated : UA.status_deactivated}`,
        severity: 'success',
      });
    } catch (err) {
      handleServiceError(err, UA.error_update_status);
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmDialog.action === 'delete') {
        await removeResourceType(confirmDialog.id);
        setSnackbar({ open: true, message: UA.resourceTypes_success_deleted, severity: 'success' });
      }
      setConfirmDialog({ open: false, id: null, action: null, dependencies: null });
    } catch (err) {
      handleServiceError(err, UA.error_confirm_action);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, id: null, action: null, dependencies: null });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <>
      <Paper sx={theme.mixins.sectionPaper} elevation={DEFAULTS.paperElevation}>
        <Box sx={theme.mixins.sectionHeader} onClick={handleToggle}>
          <Typography variant="h5">
            {UA.resourceTypes_title} ({resourceTypes.length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>

        <Divider />

        <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 3 }}>
            <ResourceTypesTable
              resourceTypes={resourceTypes}
              search={search}
              setSearch={setSearch}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onRemove={handleRemove}
              onStatusChange={handleUpdateStatus}
              setLocalError={setError}
              isLoading={loading || isActionLoading}
            />
          </Box>
        </Collapse>
      </Paper>

      <ResourceTypeForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingResourceType || {}}
        error={error}
        resourceTypes={resourceTypes}
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmAction}
        action={confirmDialog.action}
        dependencies={null}
        isLoading={isActionLoading}
        entity="resourceType"
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

export default ResourceTypesSection;
