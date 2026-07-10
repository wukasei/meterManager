import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, DIALOG_CONFIG, FORM_FIELDS, SIZES } from '../../constants';

const LocationForm = ({ open, onClose, onSubmit, initialData = {}, error, locations = [], tenants = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down(BREAKPOINTS.md));

  const [formData, setFormData] = useState(initialData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        isActive: initialData.isActive ?? true,
        id: initialData.id,
        tenant_id: initialData.tenant ? initialData.tenant.id : (initialData.tenant_id ?? null),
        occupied_area: initialData.occupied_area ?? '',
      });
      setFormErrors({});
    } else {
      setFormData({});
      setFormErrors({});
    }
  }, [open, initialData]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value) {
          error = UA.locations_name_required;
        } else if (locations.some((loc) => loc.name.trim() === value.trim() && loc.id !== initialData.id)) {
          error = UA.locations_name_exists;
        }
        break;
      case 'address':
        if (!value) {
          error = UA.locations_address_required;
        }
        break;
      case 'occupied_area': {
        const numValue = value ? parseFloat(String(value).trim()) : null;

        if (value && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
          error = UA.locations_area_error;
        }
        break;
      }
      default:
        break;
    }
    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    validateField(name, value);
  };

  const handleTenantChange = (e) => {
    const value = e.target.value;
    setFormData((s) => ({ ...s, tenant_id: value }));
  };

  const handleSubmit = () => {
    const fieldsToValidate = ['name', 'address', 'occupied_area'];
    const errors = {};
    let hasError = false;

    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
        hasError = true;
      }
    });

    if (hasError) {
      setFormErrors(errors);
      return;
    }

    onSubmit({
      ...formData,
      isActive: formData.isActive,
      tenant_id: formData.tenant_id === '' ? null : formData.tenant_id,
      occupied_area: formData.occupied_area ? parseFloat(String(formData.occupied_area).trim()) : null,
      tenantName:
        formData.tenant_id === null ? null : tenants.find((t) => t.id === formData.tenant_id)?.name || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
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
      <DialogTitle sx={theme.mixins.dialogTitle}>
        {initialData.id ? UA.locations_edit : UA.locations_add}
        <IconButton onClick={onClose} size="small">
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
          name="name"
          label={UA.locations_name}
          value={formData.name || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.name}
          helperText={formErrors.name || ' '}
        />

        <TextField
          name="address"
          label={UA.locations_address}
          value={formData.address || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          multiline={!isMobile}
          rows={isMobile ? 1 : 2}
          sx={{ mb: 2 }}
          error={!!formErrors.address}
          helperText={formErrors.address || ' '}
        />
        <TextField
          name="occupied_area"
          label={UA.locations_occupied_area}
          type="number"
          value={formData.occupied_area || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mb: 2 }}
          helperText={formErrors.occupied_area || ' '}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="tenant-select-label">{UA.locations_tenant}</InputLabel>
          <Select
            labelId="tenant-select-label"
            value={formData.tenant_id ?? ''}
            label={UA.locations_tenant}
            onChange={handleTenantChange}
            name="tenant_id"
          >
            <MenuItem value="">{UA.locations_tenant_free}</MenuItem>
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={theme.mixins.dialogActions}>
        <Button
          variant="outlined"
          onClick={onClose}
          fullWidth={isMobile}
          sx={{
            order: isMobile ? 1 : 0,
          }}
        >
          {UA.common_cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth={isMobile}
          sx={{
            order: isMobile ? 0 : 1,
            marginLeft: '0 !important',
          }}
        >
          {UA.common_save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationForm;
