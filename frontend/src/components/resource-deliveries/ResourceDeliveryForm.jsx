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
  Box,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import CustomDatePicker from '../ui/DatePicker';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, DIALOG_CONFIG, FORM_FIELDS, SIZES } from '../../constants';

const ResourceDeliveryForm = ({
  open,
  onClose,
  onSubmit,
  initialData = {},
  locations = [],
  resourceTypes = [],
  isLoading,
  error,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down(BREAKPOINTS.md));

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open) {
      const dateValue = initialData.delivery_date || initialData.deliveryDate;
      const mappedData = {
        locationId: initialData.location_id || initialData.locationId || '',
        resourceTypeId: initialData.energy_resource_type_id || initialData.resourceTypeId || '',
        quantity: initialData.quantity || '',
        unit: initialData.unit || '',
        pricePerUnit: initialData.price_per_unit || initialData.pricePerUnit || '',
        supplier: initialData.supplier || '',
        id: initialData.id,
        deliveryDate: dateValue ? new Date(dateValue).toISOString().split('T')[0] : '',
      };
      setFormData(mappedData);
      setFormErrors({});
    }
  }, [open, initialData]);

  useEffect(() => {
    if (formData.resourceTypeId) {
      const selected = resourceTypes.find((resourcee) => resourcee.id === formData.resourceTypeId);
      if (selected && selected.unit) {
        setFormData((prev) => ({
          ...prev,
          unit: selected.unit,
        }));
        setFormErrors((prev) => ({
          ...prev,
          unit: '',
        }));
      }
    }
  }, [formData.resourceTypeId, resourceTypes]);

  const validateField = (name, value) => {
    let errorMsg = '';
    if (name === 'locationId' && (!value || value === '')) errorMsg = UA.deliveries_location_required;
    if (name === 'resourceTypeId' && (!value || value === '')) errorMsg = UA.deliveries_resource_type_required;
    if (name === 'unit' && !value) errorMsg = UA.deliveries_unit_required;
    if (name === 'deliveryDate' && !value) errorMsg = UA.deliveries_date_required;
    if (name === 'quantity' || name === 'pricePerUnit') {
      const trimmed = String(value).trim();
      if (!trimmed) {
        errorMsg = name === 'quantity' ? UA.deliveries_quantity_required : UA.deliveries_price_required;
      } else {
        const num = parseFloat(trimmed);
        if (isNaN(num) || num <= 0) errorMsg = UA.deliveries_positive_number;
      }
    }

    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isIdField = name === 'locationId' || name === 'resourceTypeId';
    const processedValue = isIdField && value !== '' ? Number(value) : value;

    setFormData({ ...formData, [name]: processedValue });
    validateField(name, processedValue);
  };

  const validateForm = () => {
    const errors = {};
    ['locationId', 'resourceTypeId', 'quantity', 'unit', 'pricePerUnit', 'deliveryDate'].forEach((field) => {
      const value = formData[field];
      const errorMsg = validateField(field, value);
      if (errorMsg) errors[field] = errorMsg;
    });
    setFormErrors(errors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length) {
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const pricePerUnit = parseFloat(formData.pricePerUnit);

    if (isNaN(quantity) || quantity <= 0) {
      setFormErrors({ ...formErrors, quantity: UA.deliveries_positive_number });
      return;
    }

    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      setFormErrors({ ...formErrors, pricePerUnit: UA.deliveries_positive_number });
      return;
    }

    const locationId = Number(formData.locationId);
    const resourceTypeId = Number(formData.resourceTypeId);

    if (!locationId || !resourceTypeId) {
      setFormErrors({
        ...formErrors,
        locationId: !locationId ? UA.deliveries_location_required : '',
        resourceTypeId: !resourceTypeId ? UA.deliveries_resource_type_required : '',
      });
      return;
    }

    const submitData = {
      location_id: locationId,
      energy_resource_type_id: resourceTypeId,
      quantity: quantity,
      unit: String(formData.unit).trim(),
      price_per_unit: pricePerUnit,
      total_cost: quantity * pricePerUnit,
      delivery_date: new Date(formData.deliveryDate).toISOString(),
      supplier: formData.supplier ? String(formData.supplier).trim() : null,
    };

    if (formData.id) {
      submitData.id = formData.id;
    }

    await onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({});
    setFormErrors({});
    onClose();
  };

  const selectedResource = resourceTypes.find((rt) => rt.id === formData.resourceTypeId);
  const unitPlaceholder = selectedResource ? selectedResource.unit : UA.deliveries_unit_placeholder;

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
        <Box component="span">{initialData.id ? UA.deliveries_edit : UA.deliveries_add}</Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            ml: 1,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
          disabled={isLoading}
        >
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
          select
          name="locationId"
          label={UA.deliveries_location}
          value={formData.locationId || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mt: 1, mb: 2 }}
          error={!!formErrors.locationId}
          helperText={formErrors.locationId || ' '}
          disabled={isLoading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.deliveries_location.toLowerCase()}
          </MenuItem>
          {locations.length === 0 ? (
            <MenuItem disabled>{UA.error_no_locations_available}</MenuItem>
          ) : (
            locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))
          )}
        </TextField>
        <TextField
          select
          name="resourceTypeId"
          label={UA.deliveries_resource_type}
          value={formData.resourceTypeId || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mb: 2 }}
          error={!!formErrors.resourceTypeId}
          helperText={formErrors.resourceTypeId || ' '}
          disabled={isLoading}
        >
          <MenuItem value="">
            {UA.common_select} {UA.deliveries_resource_type.toLowerCase()}
          </MenuItem>
          {resourceTypes.length === 0 ? (
            <MenuItem disabled>{UA.error_no_resource_types_available}</MenuItem>
          ) : (
            resourceTypes.map((res) => (
              <MenuItem key={res.id} value={res.id}>
                {res.name} ({res.unit})
              </MenuItem>
            ))
          )}
        </TextField>
        <TextField
          name="quantity"
          label={UA.deliveries_quantity}
          type="number"
          value={formData.quantity || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mb: 2 }}
          error={!!formErrors.quantity}
          helperText={formErrors.quantity || ' '}
          inputProps={{ min: 0.01, step: 0.01 }}
          disabled={isLoading}
        />
        <TextField
          name="unit"
          label={unitPlaceholder}
          value={formData.unit || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mb: 2 }}
          error={!!formErrors.unit}
          helperText={formErrors.unit || ' '}
          disabled={isLoading}
        />
        <TextField
          name="pricePerUnit"
          label={UA.deliveries_price_per_unit}
          type="number"
          value={formData.pricePerUnit || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          sx={{ mb: 2 }}
          error={!!formErrors.pricePerUnit}
          helperText={formErrors.pricePerUnit || ' '}
          inputProps={{ min: 0.01, step: 0.01 }}
          disabled={isLoading}
        />
        <CustomDatePicker
          value={formData.deliveryDate || null}
          onChange={(newValue) => {
            handleChange({
              target: { name: 'deliveryDate', value: newValue },
            });
          }}
          label={UA.deliveries_delivery_date}
          error={!!formErrors.deliveryDate}
          helperText={formErrors.deliveryDate || ' '}
          sx={{ mb: 2 }}
          disabled={isLoading}
        />
        <TextField
          name="supplier"
          label={UA.deliveries_supplier}
          value={formData.supplier || ''}
          onChange={handleChange}
          fullWidth
          variant={FORM_FIELDS.textField.variant}
          helperText=" "
          disabled={isLoading}
        />
      </DialogContent>
      <DialogActions sx={theme.mixins.dialogActions}>
        <Button
          variant="outlined"
          onClick={handleClose}
          fullWidth={isMobile}
          disabled={isLoading}
          sx={{ order: isMobile ? 1 : 0 }}
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
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Зберегти'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResourceDeliveryForm;
