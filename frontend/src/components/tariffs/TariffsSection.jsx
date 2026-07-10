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
import TariffsTable from '../tariffs/TariffsTable';
import TariffForm from '../tariffs/TariffForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useTariffs } from '../../hooks/useTariffs';
import { useLocations } from '../../hooks/useLocations';
import { useResourceTypes } from '../../hooks/useResourceTypes';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';
import { DEFAULTS } from '../../constants';
import { useTheme } from '@mui/material/styles';

const TariffsSection = ({ initialExpanded = true }) => {
  const theme = useTheme();
  const {
    tariffs,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    addTariff,
    editTariff,
    removeTariff,
    loading: tariffsLoading,
    isActionLoading,
    error,
    setError,
  } = useTariffs();

  const { locations, loading: locationsLoading, error: locationsError } = useLocations();
  const { resourceTypes, loading: typesLoading, error: typesError } = useResourceTypes();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

  const handleServiceError = (err, defaultMessage = null) => {
    const userMessage = translateErrorMessage(err.message || defaultMessage || UA.error_action_default);
    setSnackbar({ open: true, message: userMessage, severity: 'error' });
    setError(userMessage);
  };

  const handleToggle = () => setExpanded((prev) => !prev);

  const handleAdd = () => {
    setEditingTariff(null);
    setError(null);
    setFormOpen(true);
  };

  const handleEdit = (tariff) => {
    setEditingTariff(tariff);
    setError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTariff?.id) {
        await editTariff(editingTariff.id, formData);
        setSnackbar({ open: true, message: UA.tariffs_success_updated, severity: 'success' });
      } else {
        await addTariff(formData);
        setSnackbar({ open: true, message: UA.tariffs_success_added, severity: 'success' });
      }
    } catch (err) {
      handleServiceError(err, UA.error_save_tariff);
    } finally {
      setFormOpen(false);
      setEditingTariff(null);
      setError(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTariff(null);
    setError(null);
  };

  const handleRemove = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await removeTariff(confirmDialog.id);
      setSnackbar({ open: true, message: UA.tariffs_success_deleted, severity: 'success' });
      handleCloseConfirmDialog();
    } catch (err) {
      handleServiceError(err, UA.error_delete_tariff);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, id: null });
  };

  const handleCloseSnackbar = () => setSnackbar({ open: false, message: '', severity: 'success' });

  const isDataLoading = tariffsLoading || locationsLoading || typesLoading;

  if (isDataLoading && tariffs.length === 0 && !formOpen) return <CircularProgress />;
  if (locationsError) return <Typography color="error">{UA.locations_load_error}</Typography>;
  if (typesError) return <Typography color="error">{UA.error_load_unknown}</Typography>;

  const locationsMap =
    locations?.reduce((acc, loc) => {
      acc[loc.id] = loc.name;
      return acc;
    }, {}) || {};

  const resourceTypesMap =
    resourceTypes?.reduce((acc, rt) => {
      acc[rt.id] = rt.name;
      return acc;
    }, {}) || {};

  return (
    <>
      <Paper sx={theme.mixins.sectionPaper} elevation={DEFAULTS.paperElevation}>
        <Box sx={theme.mixins.sectionHeader} onClick={handleToggle}>
          <Typography variant="h5">
            {UA.tariffs_title} ({tariffs.length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>

        <Divider />

        <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 3 }}>
            <TariffsTable
              tariffs={tariffs}
              search={search}
              setSearch={setSearch}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              resourceTypeFilter={resourceTypeFilter}
              setResourceTypeFilter={setResourceTypeFilter}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleRemove}
              setLocalError={setError}
              locationsMap={locationsMap}
              resourceTypesMap={resourceTypesMap}
              locations={locations}
              resourceTypes={resourceTypes}
              isLoading={isDataLoading || isActionLoading}
            />
          </Box>
        </Collapse>
      </Paper>

      {formOpen && (
        <TariffForm
          open={formOpen}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          initialData={editingTariff || {}} // тепер він точно отримає дані, бо компонент створиться заново
          error={error}
          locations={locations.filter((l) => l.isActive)}
          resourceTypes={resourceTypes.filter((rt) => rt.isActive)}
          isLoading={isActionLoading}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        action="delete"
        entity="tariff"
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

export default TariffsSection;
