import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import CustomDatePicker from '../ui/DatePicker';
import { Close } from '@mui/icons-material';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, DIALOG_CONFIG, SIZES } from '../../constants';
import { format, parseISO } from 'date-fns';

const MeterTenantForm = ({
  open,
  onClose,
  onSubmit,
  initialData = {},
  error,
  tenants = [],
  meters = [],
  locations = [],
  resourceTypes = [],
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down(BREAKPOINTS.md));

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const resourceTypeMap = useMemo(
    () =>
      resourceTypes.reduce((acc, rt) => {
        acc[rt.id] = rt.name;
        return acc;
      }, {}),
    [resourceTypes]
  );

  useEffect(() => {
    if (open) {
      const initialMeter = meters.find((m) => m.id.toString() === (initialData.meterId || ''));
      const initialLocation = initialMeter?.location_id || '';
      setFormData({
        tenantId: initialData.tenantId || '',
        meterId: initialData.meterId || '',
        startDate: initialData.startDate ? parseISO(initialData.startDate) : null,
        endDate: initialData.endDate ? parseISO(initialData.endDate) : null,
        id: initialData.id,
      });
      setSelectedLocationId(initialLocation);
      setFormErrors({});
    } else {
      setSelectedLocationId('');
    }
  }, [open]);

  const validateField = (name, value, currentFormData) => {
    let errorMsg = '';
    if (name === 'tenantId' && !value) errorMsg = UA.meterTenants_tenant_required;
    if (name === 'meterId' && !value) errorMsg = UA.meterTenants_meter_required;
    if (name === 'startDate' && !value) errorMsg = UA.meterTenants_start_date_required;

    const startDate = name === 'startDate' ? value : currentFormData.startDate;
    const endDate = name === 'endDate' ? value : currentFormData.endDate;

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      if (name === 'endDate') errorMsg = UA.meterTenants_end_date_before_start;
      else if (name === 'startDate')
        setFormErrors((prev) => ({ ...prev, endDate: UA.meterTenants_end_date_before_start }));
    } else {
      if (name === 'endDate' && formErrors.startDate?.includes('пізніше'))
        setFormErrors((prev) => ({ ...prev, startDate: '' }));
      if (name === 'startDate' && formErrors.endDate?.includes('раніше'))
        setFormErrors((prev) => ({ ...prev, endDate: '' }));
    }

    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleLocationChange = (e) => {
    const newLocationId = e.target.value === '' ? '' : Number(e.target.value);
    setSelectedLocationId(newLocationId);
    setFormData((prev) => ({ ...prev, meterId: '' }));
    //setFormErrors((prev) => ({ ...prev, meterId: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const processedValue =
      (name === 'endDate' || name === 'startDate') && value === ''
        ? null
        : (name === 'tenantId' || name === 'meterId') && value !== ''
          ? Number(value)
          : value;

    const updatedFormData = { ...formData, [name]: processedValue };
    setFormData(updatedFormData);
    validateField(name, processedValue, updatedFormData);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.tenantId) errors.tenantId = UA.meterTenants_tenant_required;
    if (!selectedLocationId) errors.locationId = UA.meterTenants_location_first;
    if (!formData.meterId) errors.meterId = UA.meterTenants_meter_required;
    if (!formData.startDate) errors.startDate = UA.meterTenants_start_date_required;

    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = UA.meterTenants_end_date_before_start;
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const apiData = {
        tenant_id: formData.tenantId,
        meter_id: formData.meterId,
        assigned_from: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : null,
        assigned_to: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : null,
        id: formData.id,
      };
      await onSubmit(apiData);
    } catch (error) {
      if (error.type === 'validation' && error.validationErrors) {
        const backendErrors = {};

        // Handle array format (like express-validator)
        if (Array.isArray(error.validationErrors)) {
          error.validationErrors.forEach((errItem) => {
            const field = errItem.path;
            const message = errItem.msg;

            const fieldMap = {
              meter_id: 'meterId',
            };

            const frontendField = fieldMap[field] || field;

            backendErrors[frontendField] = message;
          });
        }
        setFormErrors(backendErrors);
        return;
      }
      throw error;
    }
  };

  const handleClose = () => {
    setFormErrors({});
    setSelectedLocationId('');
    onClose();
  };

  const availableMeters = useMemo(() => {
    if (!selectedLocationId) return [];
    return meters.filter((m) => m.location_id === selectedLocationId && m.isActive);
  }, [selectedLocationId, meters]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth={DIALOG_CONFIG.fullWidth}
      maxWidth={DIALOG_CONFIG.maxWidth.sm}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : isMobileOrTablet ? DIALOG_CONFIG.paperMaxWidthTablet : DIALOG_CONFIG.paperMaxWidth,
          maxWidth: isMobile ? '100%' : DIALOG_CONFIG.paperMaxWidth,
          margin: isMobile ? 0 : 'auto',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: isMobile ? '1.125rem' : '1.25rem',
          fontWeight: 600,
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {formData.id ? UA.meterTenants_edit : UA.meterTenants_add}
        <IconButton onClick={handleClose} size="small" disabled={isLoading}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: isMobile ? 2 : 3, pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        )}

        <TextField
          select
          name="locationId"
          label={UA.meterTenants_location_filter}
          value={selectedLocationId || ''}
          onChange={handleLocationChange}
          fullWidth
          variant="outlined"
          size="medium"
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.locationId}
          helperText={formErrors.locationId || ' '}
          disabled={isLoading}
        >
          <MenuItem value="">
            <em>{UA.meterTenants_select_location}</em>
          </MenuItem>
          {locations.map((loc) => (
            <MenuItem key={loc.id} value={loc.id.toString()}>
              {loc.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          name="meterId"
          label={UA.meterTenants_meter}
          value={formData.meterId || ''}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          size="medium"
          sx={{ mb: 2 }}
          error={!!formErrors.meterId}
          helperText={formErrors.meterId || ' '}
          disabled={isLoading || !selectedLocationId}
        >
          {!selectedLocationId ? (
            <MenuItem disabled value="">
              {UA.meterTenants_select_location_first}
            </MenuItem>
          ) : availableMeters.length === 0 ? (
            <MenuItem disabled value="">
              {UA.meterTenants_no_meters}
            </MenuItem>
          ) : (
            availableMeters.map((m) => (
              <MenuItem key={m.id} value={m.id.toString()}>
                {`${m.serial_number || `ID:${m.id}`} - ${resourceTypeMap[m.energy_resource_type_id] || UA.status_unknown_resource}`}
              </MenuItem>
            ))
          )}
        </TextField>

        <TextField
          select
          name="tenantId"
          label={UA.meterTenants_tenant}
          value={formData.tenantId || ''}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          size="medium"
          sx={{ mb: 2 }}
          error={!!formErrors.tenantId}
          helperText={formErrors.tenantId || ' '}
          disabled={isLoading}
        >
          {tenants.map((t) => (
            <MenuItem key={t.id} value={t.id.toString()}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>

        <CustomDatePicker
          value={formData.startDate || null}
          onChange={(newValue) => {
            handleChange({ target: { name: 'startDate', value: newValue } });
          }}
          label={UA.meterTenants_start_date}
          maxDate={formData.endDate || undefined}
          error={!!formErrors.startDate}
          helperText={formErrors.startDate || ' '}
          sx={{ mb: 2 }}
          disabled={isLoading}
          slotProps={{ textField: { size: 'medium', fullWidth: true } }}
        />

        <CustomDatePicker
          value={formData.endDate || null}
          onChange={(newValue) => {
            handleChange({ target: { name: 'endDate', value: newValue } });
          }}
          label={UA.meterTenants_end_date}
          minDate={formData.startDate || undefined}
          error={!!formErrors.endDate}
          helperText={formErrors.endDate || UA.meterTenants_end_date_optional}
          disabled={isLoading}
          slotProps={{ textField: { size: 'medium', fullWidth: true } }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          gap: isMobile ? 1 : 1,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          '& .MuiButton-root': {
            minWidth: isMobile ? 'auto' : '80px',
            fontSize: isMobile ? '1rem' : '0.875rem',
            height: isMobile ? SIZES.button.mobileHeight : SIZES.button.desktopHeight,
          },
        }}
      >
        <Button
          variant="outlined"
          onClick={handleClose}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 1 : 0 }}
          disabled={isLoading}
        >
          {UA.common_cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 0 : 1, marginLeft: '0 !important' }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={SIZES.circularProgress.medium} color="inherit" /> : UA.common_save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeterTenantForm;
