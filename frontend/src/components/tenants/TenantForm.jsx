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
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, DIALOG_CONFIG, FORM_FIELDS, SIZES } from '../../constants';

const TenantForm = ({ open, onClose, onSubmit, initialData, error, tenants }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData((prev) =>
        Object.keys(prev).length === 0
          ? {
              name: initialData?.name || '',
              contactPerson: initialData?.contactPerson || '',
              phone: initialData?.phone || '',
              email: initialData?.email || '',
              isActive: initialData?.isActive ?? true,
              id: initialData?.id,
            }
          : prev
      );
      setFormErrors({});
    }
  }, [open]);

  const validateField = (name, value) => {
    let errorMsg = '';
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    if (name === 'name') {
      if (!trimmedValue) {
        errorMsg = UA.tenants_name_required;
      } else if (tenants.some((t) => t.name.trim() === trimmedValue && t.id !== initialData.id)) {
        errorMsg = UA.error_tenant_exists;
      }
    }
    if (name === 'email' && trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      errorMsg = UA.tenants_email_format;
    }
    if (name === 'phone' && trimmedValue && !trimmedValue.match(/^\+380[0-9]{9}$/)) {
      errorMsg = UA.tenants_phone_format;
    }

    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleSubmit = async () => {
    const fieldsToValidate = ['name', 'phone', 'email'];
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

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        contactPerson: formData.contactPerson?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        isActive: formData.isActive ?? true,
        id: formData.id,
      });
    } catch (error) {
      if (error.type === 'validation' && error.validationErrors) {
        const backendErrors = {};

        // Handle array format (like express-validator)
        if (Array.isArray(error.validationErrors)) {
          error.validationErrors.forEach((errItem) => {
            const field = errItem.path;
            const message = errItem.msg;

            // Optional field mapping
            const fieldMap = {
              contact_person: 'contactPerson',
              is_active: 'isActive',
            };

            const frontendField = fieldMap[field] || field;

            backendErrors[frontendField] = message;
          });
        }
        setFormErrors(backendErrors);
        return;
      }

      throw error;
    } finally {
      setIsSubmitting(false);
    }
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
        {initialData.id ? UA.tenants_edit : UA.tenants_add}
        <IconButton onClick={handleClose} size="small" disabled={isSubmitting}>
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
          label={UA.tenants_name}
          value={formData.name || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.name}
          helperText={formErrors.name || ' '}
          disabled={isSubmitting}
          required
        />

        <TextField
          name="contactPerson"
          label={UA.tenants_contact}
          value={formData.contactPerson || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          helperText=" "
          disabled={isSubmitting}
        />

        <TextField
          name="phone"
          label={UA.tenants_phone}
          value={formData.phone || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mb: 2 }}
          error={!!formErrors.phone}
          helperText={formErrors.phone || UA.tenants_phone_helper}
          disabled={isSubmitting}
        />

        <TextField
          name="email"
          label={UA.tenants_email}
          //type="email"
          value={formData.email || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          error={!!formErrors.email}
          helperText={formErrors.email || ' '}
          disabled={isSubmitting}
        />
      </DialogContent>

      <DialogActions sx={theme.mixins.dialogActions}>
        <Button
          variant="outlined"
          onClick={handleClose}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 1 : 0 }}
          disabled={isSubmitting}
        >
          {UA.common_cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth={isMobile}
          sx={{ order: isMobile ? 0 : 1, marginLeft: '0 !important' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={SIZES.circularProgress.medium} color="inherit" /> : UA.common_save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TenantForm;
