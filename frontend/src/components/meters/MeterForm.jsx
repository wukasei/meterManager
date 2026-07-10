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
  CircularProgress,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Close } from '@mui/icons-material';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, SIZES, FORM_FIELDS, DIALOG_CONFIG } from '../../constants';

const MeterForm = ({
  open,
  onClose,
  onSubmit,
  initialData = {},
  error,
  meters = [],
  locations = [],
  energyResourceTypes = [],
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFormData({
        serial_number: initialData.serial_number || '',
        // Для Select полів використовуємо '' як fallback, якщо значення немає,
        // це відповідає MenuItem value=""
        location_id: initialData.location_id || '',
        energy_resource_type_id: initialData.energy_resource_type_id || '',
        isActive: initialData.isActive ?? true,
        id: initialData.id,
      });
      setFormErrors({});
    }
    // Скидаємо лише при відкритті, щоб уникнути конфліктів стану
  }, [open, initialData]);

  const validateField = (name, value) => {
    let errorMsg = '';
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    if (name === 'serial_number') {
      if (!trimmedValue) {
        errorMsg = UA.meters_serial_required;
      } else if (
        Array.isArray(meters) &&
        meters.some((m) => m.serial_number === trimmedValue && m.id !== formData.id)
      ) {
        errorMsg = UA.meters_serial_exists;
      }
    }

    if (name === 'location_id' && (trimmedValue === '' || !trimmedValue)) {
      errorMsg = UA.meters_location_required;
    }
    if (name === 'energy_resource_type_id' && (trimmedValue === '' || !trimmedValue)) {
      errorMsg = UA.meters_resource_required;
    }

    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Приведення ID до числа, якщо це не пустий рядок ('' -> '')
    const processedValue =
      (name === 'location_id' || name === 'energy_resource_type_id') && value !== '' ? Number(value) : value;

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    validateField(name, processedValue);
  };

  const handleSubmit = () => {
    const fieldsToValidate = ['serial_number', 'location_id', 'energy_resource_type_id'];
    const errors = {};
    let hasError = false;

    fieldsToValidate.forEach((field) => {
      const errorMsg = validateField(field, formData[field]);
      if (errorMsg) {
        errors[field] = errorMsg;
        hasError = true;
      }
    });

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    // Передача даних для бекенду
    onSubmit({
      ...formData,
      // isActive має бути явно визначений (або true, або false)
      isActive: formData.isActive ?? true,
      // ID вже є числом у formData, якщо воно не пусте
    });
  };

  const handleClose = () => {
    // Скидаємо помилки та викликаємо onClose
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
          width: '100%',
          maxWidth: DIALOG_CONFIG.paperMaxWidth,
          margin: isMobile ? 0 : 'auto',
        },
      }}
    >
      <DialogTitle sx={theme.mixins.dialogTitle}>
        {initialData.id ? UA.meters_edit : UA.meters_add}
        <IconButton onClick={handleClose} size="small" disabled={loading}>
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
          name="serial_number"
          label={UA.meters_serial_number}
          value={formData.serial_number || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.serial_number}
          helperText={formErrors.serial_number || ' '}
          disabled={loading}
        />

        <TextField
          select
          name="location_id"
          label={UA.meters_location}
          value={formData.location_id || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          error={!!formErrors.location_id}
          helperText={formErrors.location_id || ' '}
          disabled={loading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.meters_location.toLowerCase()}
          </MenuItem>
          {(locations || [])
            .filter((l) => l.isActive)
            .map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
        </TextField>

        <TextField
          select
          name="energy_resource_type_id"
          label={UA.meters_resource_type}
          value={formData.energy_resource_type_id || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          error={!!formErrors.energy_resource_type_id}
          helperText={formErrors.energy_resource_type_id || ' '}
          disabled={loading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.meters_resource_type.toLowerCase()}
          </MenuItem>
          {(energyResourceTypes || [])
            .filter((rt) => rt.isActive)
            .map((rt) => (
              <MenuItem key={rt.id} value={rt.id}>
                {rt.name} ({rt.unit})
              </MenuItem>
            ))}
        </TextField>
      </DialogContent>

      <DialogActions sx={theme.mixins.dialogActions}>
        <Button
          variant="outlined"
          onClick={handleClose}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 1 : 0 }}
          disabled={loading}
        >
          {UA.common_cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 0 : 1, marginLeft: '0 !important' }}
        >
          {loading ? <CircularProgress size={SIZES.circularProgress.medium} color="inherit" /> : UA.common_save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeterForm;
