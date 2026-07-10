import { useState, useEffect } from 'react';
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
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import CustomDatePicker from '../ui/DatePicker';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, DIALOG_CONFIG, FORM_FIELDS, SIZES } from '../../constants';

const formatISODate = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const TariffForm = ({ open, onClose, onSubmit, initialData = {}, error, locations, resourceTypes, isLoading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open && initialData && initialData.id) {
      setFormData({
        location_id: initialData?.location_id || initialData?.locationId || '',
        energy_resource_type_id: initialData?.energy_resource_type_id || initialData?.resourceTypeId || '',
        price: initialData?.price || '',
        valid_from: initialData.valid_from ? new Date(initialData.valid_from) : '',
        valid_to: initialData.valid_to ? new Date(initialData.valid_to) : '',
        id: initialData?.id,
      });
      console.log("Всі поля, які прийшли в initialData:", Object.keys(initialData));
      setFormErrors({});
    }
  }, [open, initialData]);

  const validateField = (name, value) => {
    let errorMsg = '';
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    if (
      (name === 'location_id' || name === 'energy_resource_type_id' || name === 'valid_from') &&
      (!trimmedValue || trimmedValue === '')
    ) {
      if (name === 'valid_from') errorMsg = UA.tariffs_valid_from_required;
      else if (name === 'location_id') errorMsg = UA.meters_location_required;
      else if (name === 'energy_resource_type_id') errorMsg = UA.meters_resource_required;
    }

    if (name === 'price') {
      if (!trimmedValue) {
        errorMsg = UA.tariffs_price_required;
      } else if (isNaN(trimmedValue) || Number(trimmedValue) <= 0) {
        errorMsg = UA.validation_price_positive || 'Ціна має бути позитивним числом.';
      }
    }

    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const isIdField = name === 'location_id' || name === 'energy_resource_type_id';
    const processedValue = isIdField && value !== '' ? Number(value) : value;

    const updatedFormData = { ...formData, [name]: processedValue };
    setFormData(updatedFormData);
    validateField(name, processedValue, updatedFormData);
  };

  const handleDateChange = (name, value) => {
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    validateField(name, value, updatedFormData);
  };

  const handleSubmit = () => {
    const fieldsToValidate = ['location_id', 'energy_resource_type_id', 'price', 'valid_from'];
    const errors = {};
    let hasError = false;

    fieldsToValidate.forEach((field) => {
      const errorMsg = validateField(field, formData[field], formData);
      if (errorMsg) {
        errors[field] = errorMsg;
        hasError = true;
      }
    });

    if (formData.valid_from && formData.valid_to && new Date(formData.valid_to) < new Date(formData.valid_from)) {
      errors.valid_to = UA.validation_date_end_before_start;
      errors.valid_from = UA.validation_date_start_before_end;
      hasError = true;
    }

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      location_id: Number(formData.location_id),
      energy_resource_type_id: Number(formData.energy_resource_type_id),
      price: parseFloat(formData.price),
      valid_from: formatISODate(formData.valid_from),
      valid_to: formData.valid_to ? formatISODate(formData.valid_to) : null,
    };

    onSubmit(payload);
  };

  const handleClose = () => {
    setFormData({});
    setFormErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={DIALOG_CONFIG.maxWidth.sm}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          maxWidth: '600px',
          margin: isMobile ? 0 : 'auto',
        },
      }}
    >
      <DialogTitle sx={theme.mixins.dialogTitle}>
        {initialData.id ? UA.tariffs_edit : UA.tariffs_add}
        <IconButton onClick={handleClose} size="small" disabled={isLoading}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={theme.mixins.dialogContent}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: isMobile ? '0.875rem' : '1rem' }}>
            {error}
          </Alert>
        )}

        <TextField
          select
          name="location_id"
          label={UA.tariffs_location}
          value={formData.location_id || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.location_id}
          helperText={formErrors.location_id || ' '}
          disabled={isLoading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.tariffs_location.toLowerCase()}
          </MenuItem>
          {(locations || [])
            .filter((loc) => loc.isActive)
            .map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
        </TextField>

        <TextField
          select
          name="energy_resource_type_id"
          label={UA.tariffs_resource_type}
          value={formData.energy_resource_type_id || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          error={!!formErrors.energy_resource_type_id}
          helperText={formErrors.energy_resource_type_id || ' '}
          disabled={isLoading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.tariffs_resource_type.toLowerCase()}
          </MenuItem>
          {(resourceTypes || [])
            .filter((res) => res.isActive)
            .map((res) => (
              <MenuItem key={res.id} value={res.id}>
                {res.name} ({res.unit})
              </MenuItem>
            ))}
        </TextField>

        <TextField
          name="price"
          label={UA.tariffs_price}
          type="number"
          inputProps={{ min: 0, step: 0.0001 }}
          value={formData.price || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          error={!!formErrors.price}
          helperText={formErrors.price || ' '}
          disabled={isLoading}
        />

        <CustomDatePicker
          value={formData.valid_from || null}
          onChange={(newValue) => {
            handleDateChange('valid_from', newValue);
          }}
          label={UA.tariffs_valid_from}
          error={!!formErrors.valid_from}
          helperText={formErrors.valid_from || ' '}
          sx={{ mb: 2 }}
          disabled={isLoading}
          slotProps={{ textField: { size: 'medium', fullWidth: true, required: true } }}
        />

        <CustomDatePicker
          value={formData.valid_to || null}
          onChange={(newValue) => {
            handleDateChange('valid_to', newValue);
          }}
          label={UA.tariffs_valid_to}
          minDate={formData.valid_from ? new Date(formData.valid_from) : undefined}
          error={!!formErrors.valid_to}
          helperText={formErrors.valid_to || UA.tariffs_valid_to_optional}
          disabled={isLoading}
          slotProps={{ textField: { size: 'medium', fullWidth: true } }}
        />
      </DialogContent>

      <DialogActions sx={theme.mixins.dialogActions}>
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

export default TariffForm;