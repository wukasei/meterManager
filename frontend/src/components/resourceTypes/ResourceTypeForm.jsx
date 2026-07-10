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

const ResourceTypeForm = ({ open, onClose, onSubmit, initialData = {}, error, resourceTypes = [], isLoading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down(BREAKPOINTS.md));

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData.name || '',
        unit: initialData.unit || '',
        isActive: initialData.isActive ?? true,
        id: initialData.id,
      });
      setFormErrors({});
    }
  }, [open, initialData]);

  const validateField = (name, value) => {
    let errorMsg = '';
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    if (name === 'name') {
      if (!trimmedValue) {
        errorMsg = UA.resourceTypes_name_required;
      } else if (resourceTypes.some((t) => t.name.trim() === trimmedValue && t.id !== initialData.id)) {
        errorMsg = UA.error_resource_type_exists;
      }
    }
    if (name === 'unit' && !trimmedValue) {
      errorMsg = UA.resourceTypes_unit_required;
    }
    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleSubmit = () => {
    const fieldsToValidate = ['name', 'unit'];
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

    onSubmit({
      ...formData,
      name: formData.name.trim(),
      unit: formData.unit.trim(),
      isActive: formData.isActive ?? true,
    });
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
          width: isMobile ? '100%' : isMobileOrTablet ? DIALOG_CONFIG.paperMaxWidthTablet : DIALOG_CONFIG.paperMaxWidth,
          maxWidth: isMobile ? '100%' : DIALOG_CONFIG.paperMaxWidth,
          margin: isMobile ? 0 : 'auto',
        },
      }}
    >
      <DialogTitle sx={theme.mixins.dialogTitle}>
        {initialData.id ? UA.resourceTypes_edit : UA.resourceTypes_add}
        <IconButton onClick={handleClose} disabled={isLoading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={theme.mixins.dialogContent}>
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          >
            {error}
          </Alert>
        )}

        <TextField
          name="name"
          label={UA.resourceTypes_name}
          value={formData.name || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.name}
          helperText={formErrors.name || ' '}
          disabled={isLoading}
        />

        <TextField
          name="unit"
          label={UA.resourceTypes_unit}
          value={formData.unit || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          size={FORM_FIELDS.textField.size}
          error={!!formErrors.unit}
          helperText={formErrors.unit || ' '}
          disabled={isLoading}
        />
      </DialogContent>

      <DialogActions sx={theme.mixins.dialogActions}>
        <Button
          variant="outlined"
          onClick={handleClose}
          fullWidth={isMobile}
          disabled={isLoading}
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
          disabled={isLoading}
          sx={{
            order: isMobile ? 0 : 1,
            marginLeft: '0 !important',
          }}
        >
          {isLoading ? <CircularProgress size={SIZES.circularProgress.medium} color="inherit" /> : UA.common_save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResourceTypeForm;
