import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '../../hooks/useMediaQuery';
import { createMeterReading, updateMeterReading } from '../../api/meterReadings';
import { useAuthContext } from '../../contexts/AuthContext';
import { useMeterTenants } from '../../hooks/useMeterTenants';
import { UA } from '../../utils/uaDictionary';

const MeterReadingForm = ({ onSuccess, initialData, onCancel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:800px)');
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const { getToken, loginWithRedirect, user } = useAuthContext();
  const { getAllMeterTenants } = useMeterTenants();

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedResource, setSelectedResource] = useState('');

  const [formData, setFormData] = useState({
    meter_tenant_id: '',
    reading_date: '',
    area_based_consumption: '',
    calculation_method: '',
    executor_name: '',
    tenant_representative: '',
    calculation_coefficient: 1,
    distributions: {
      CA: { current_reading: '', previous_reading: '', area_percentage: 100 },
      CP: { current_reading: '', previous_reading: '', area_percentage: 100 },
      GR: { current_reading: '', previous_reading: '', area_percentage: 100 },
    },
  });

  const [allMeterTenants, setAllMeterTenants] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState(null);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError(UA.meterReadings_token_failed);
          setLoadingTenants(false);
          return;
        }
        const list = await getAllMeterTenants(token);
        const mts = list?.data || list;
        setAllMeterTenants(mts);

        const uniqueLocationsMap = mts.reduce((map, mt) => {
          const location = mt.Meter?.Location;
          if (location && !map.has(location.id)) {
            map.set(location.id, {
              id: location.id,
              name: `${location.name} - ${location.address}`,
            });
          }
          return map;
        }, new Map());

        setAvailableLocations(Array.from(uniqueLocationsMap.values()));
        setLoadingTenants(false);
      } catch {
        setError(UA.meterReadings_load_error);
        setLoadingTenants(false);
      }
    })();
  }, [getToken, getAllMeterTenants]);

  useEffect(() => {
    if (initialData && allMeterTenants.length > 0 && !isInitializedRef.current) {
      const initialMt = allMeterTenants.find((mt) => mt.id === initialData.meter_tenant_id);
      if (initialMt?.Meter?.Location) {
        setSelectedLocationId(initialMt.Meter.Location.id);
        setSelectedResource(initialMt.Meter.EnergyResourceType?.name || '');
      }

      const loadedDistributions = {
        CA: { current_reading: '', previous_reading: '', area_percentage: 100 },
        CP: { current_reading: '', previous_reading: '', area_percentage: 100 },
        GR: { current_reading: '', previous_reading: '', area_percentage: 100 },
      };

      if (initialData.distributions && Array.isArray(initialData.distributions)) {
        initialData.distributions.forEach((dist) => {
          if (loadedDistributions[dist.category]) {
            loadedDistributions[dist.category] = {
              current_reading: dist.current_reading || '',
              previous_reading: dist.previous_reading || '',
              area_percentage: dist.area_percentage || 100,
            };
          }
        });
      }

      let readingDate = initialData.reading_date;
      if (readingDate) {
        if (readingDate instanceof Date) {
          readingDate = readingDate.toISOString().split('T')[0];
        } else if (typeof readingDate === 'string') {
          if (readingDate.includes('T')) {
            readingDate = readingDate.split('T')[0];
          }
        }
      }

      setFormData({
        meter_tenant_id: initialData.meter_tenant_id,
        reading_date: readingDate || '',
        area_based_consumption: initialData.area_based_consumption || '',
        calculation_method: initialData.calculation_method || '',
        executor_name: initialData.executor_name || '',
        tenant_representative: initialData.tenant_representative || '',
        calculation_coefficient: initialData.calculation_coefficient || 1,
        distributions: loadedDistributions,
      });

      isInitializedRef.current = true;
    }
  }, [initialData, allMeterTenants]);

  const handleChange = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name === 'selectedLocationId') {
      const newLocationId = value === '' ? '' : Number(value);
      setSelectedLocationId(newLocationId);
      setFormData((prev) => ({ ...prev, meter_tenant_id: '' }));
      setSelectedResource('');
      return;
    }
    if (name === 'meter_tenant_id' && value !== '') {
      const mtId = Number(value);
      const mt = allMeterTenants.find((t) => t.id === mtId);
      if (mt?.Meter?.EnergyResourceType) {
        const type = mt.Meter.EnergyResourceType;
        setSelectedResource(`${type.name}`);
      } else {
        setSelectedResource('');
      }
      value = mtId;
    } else if (name === 'meter_tenant_id' && value === '') {
      setSelectedResource('');
      value = '';
    }
    if (name === 'calculation_coefficient') {
      if (value === '') {
        setFormData((prev) => ({ ...prev, [name]: '' }));
        return;
      }
      value = Number(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDistributionChange = (category, field, value) => {
    setFormData((prev) => ({
      ...prev,
      distributions: {
        ...prev.distributions,
        [category]: {
          ...prev.distributions[category],
          [field]: value === '' ? '' : Number(value),
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (Number(formData.calculation_coefficient) === 0) {
      setError('Коефіцієнт не може дорівнювати нулю');
      return;
    }

    const token = await getToken();
    if (!token) {
      setError(UA.meterReadings_token_error);
      loginWithRedirect();
      return;
    }

    if (!formData.meter_tenant_id || !formData.reading_date || !formData.calculation_method) {
      setError(UA.meterReadings_fill_all_required);
      return;
    }

    const hasDistributions = ['CA', 'CP', 'GR'].some((cat) => formData.distributions[cat].current_reading !== '');
    if (!hasDistributions) {
      setError(UA.meterReadings_fill_distribution);
      return;
    }

    try {
      setLoading(true);

      const distributionsArray = [];
      let totalCurrentReading = 0;

      ['CA', 'CP', 'GR'].forEach((category) => {
        const dist = formData.distributions[category];
        if (dist.current_reading !== '' || dist.previous_reading !== '') {
          const currentVal = Number(dist.current_reading) || 0;
          totalCurrentReading += currentVal;

          distributionsArray.push({
            category,
            current_reading: currentVal,
            previous_reading: dist.previous_reading || 0,
            calculation_coefficient: formData.calculation_coefficient || 1,
            area_percentage: dist.area_percentage || 100,
          });
        }
      });

      const payload = {
        meter_tenant_id: Number(formData.meter_tenant_id),
        reading_date: formData.reading_date,
        current_reading: totalCurrentReading,
        calculation_method: formData.calculation_method,
        area_based_consumption:
          formData.area_based_consumption !== '' ? Number(formData.area_based_consumption) : undefined,
        calculation_coefficient: formData.calculation_coefficient || 1,
        executor_name: formData.executor_name || null,
        tenant_representative: formData.tenant_representative || null,
        created_by: user?.id,
        distributions: distributionsArray,
      };

      let response;
      if (initialData?.id) {
        response = await updateMeterReading(token, initialData.id, payload);
      } else {
        response = await createMeterReading(token, payload);
      }

      onSuccess?.(response);
    } catch (err) {
      //console.log("error",err);
      setError(err.response?.data?.message || err.message || UA.meterReadings_save_error);
    } finally {
      setLoading(false);
    }
  };

  const selectLabelId = 'meter-tenant-select-label';

  const categoryLabels = {
    CA: UA.meterReadings_category_ca,
    CP: UA.meterReadings_category_cp,
    GR: UA.meterReadings_category_gr,
  };

  return (
    <Paper
      sx={{
        p: isMobile ? 2 : 3,
        maxWidth: isMobile ? '100%' : isTablet ? '90%' : 800,
        mx: 'auto',
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontSize: isMobile ? '1.125rem' : '1.25rem',
          fontWeight: 600,
          mb: isMobile ? 2 : 3,
        }}
      >
        {UA.meterReadings_form_title}
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2, fontSize: isMobile ? '0.9rem' : '1rem' }}>
          {error}
        </Typography>
      )}

      {loadingTenants ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <FormControl fullWidth required>
            <InputLabel id="location-select-label">{UA.meterReadings_location}</InputLabel>
            <Select
              labelId="location-select-label"
              label={UA.meterReadings_location}
              name="selectedLocationId"
              value={selectedLocationId}
              onChange={handleChange}
            >
              <MenuItem value="">{UA.common_select}</MenuItem>
              {availableLocations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required disabled={!selectedLocationId}>
            <InputLabel id={selectLabelId}>{UA.meterReadings_meter_tenant}</InputLabel>
            <Select
              labelId={selectLabelId}
              label={UA.meterReadings_meter_tenant}
              name="meter_tenant_id"
              value={formData.meter_tenant_id}
              onChange={handleChange}
            >
              <MenuItem value="">{UA.meterReadings_select_meter_tenant}</MenuItem>
              {allMeterTenants
                .filter((mt) => mt.Meter?.location_id === selectedLocationId)
                .map((mt) => (
                  <MenuItem key={mt.id} value={mt.id}>
                    {mt.Tenant?.name} – {mt.Meter?.serial_number}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            label={UA.meterReadings_resource}
            value={selectedResource}
            InputProps={{ readOnly: true }}
            fullWidth
            sx={{ bgcolor: '#f5f5f5' }}
          />

          <TextField
            label={UA.meterReadings_reading_date}
            type="date"
            name="reading_date"
            value={formData.reading_date}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            required
            fullWidth
          />

          <FormControl fullWidth required>
            <InputLabel>{UA.meterReadings_calculation_method}</InputLabel>
            <Select
              label={UA.meterReadings_calculation_method}
              name="calculation_method"
              value={formData.calculation_method}
              onChange={handleChange}
            >
              <MenuItem value="">{UA.meterReadings_select_method}</MenuItem>
              <MenuItem value="direct">{UA.meterReadings_method_direct}</MenuItem>
              <MenuItem value="area_based">{UA.meterReadings_method_area}</MenuItem>
              <MenuItem value="mixed">{UA.meterReadings_method_mixed}</MenuItem>
            </Select>
          </FormControl>

          {(formData.calculation_method === 'area_based' || formData.calculation_method === 'mixed') && (
            <TextField
              label={UA.meterReadings_area_consumption}
              type="number"
              name="area_based_consumption"
              value={formData.area_based_consumption}
              onChange={handleChange}
              required
            />
          )}

          <TextField
            label={UA.meterReadings_coefficient}
            type="number"
            name="calculation_coefficient"
            value={formData.calculation_coefficient}
            onChange={handleChange}
            inputProps={{ step: '0.01', min: '0' }}
            required
          />

          {selectedResource === 'Електроенергія' ? (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle1" color="textSecondary">
                  {UA.meterReadings_distributions}
                </Typography>
              </Divider>

              {['CA', 'CP', 'GR'].map((category) => (
                <Box
                  key={category}
                  sx={{
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    bgcolor: '#fafafa',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    {categoryLabels[category]}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={UA.meterReadings_current}
                        type="number"
                        value={formData.distributions[category].current_reading}
                        onChange={(e) => handleDistributionChange(category, 'current_reading', e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ step: '0.01' }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={UA.meterReadings_previous}
                        type="number"
                        value={formData.distributions[category].previous_reading}
                        onChange={(e) => handleDistributionChange(category, 'previous_reading', e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ step: '0.01' }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </>
          ) : (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle1" color="textSecondary">
                  {UA.meterReadings_readings}
                </Typography>
              </Divider>

              <Box
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  bgcolor: '#fafafa',
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={UA.meterReadings_current}
                      type="number"
                      value={formData.distributions.CA.current_reading}
                      onChange={(e) => handleDistributionChange('CA', 'current_reading', e.target.value)}
                      fullWidth
                      size="small"
                      inputProps={{ step: '0.01' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={UA.meterReadings_previous}
                      type="number"
                      value={formData.distributions.CA.previous_reading}
                      onChange={(e) => handleDistributionChange('CA', 'previous_reading', e.target.value)}
                      fullWidth
                      size="small"
                      inputProps={{ step: '0.01' }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </>
          )}

          <TextField
            label={UA.meterReadings_executor_name}
            name="executor_name"
            value={formData.executor_name}
            onChange={handleChange}
          />
          <TextField
            label={UA.meterReadings_tenant_representative}
            name="tenant_representative"
            value={formData.tenant_representative}
            onChange={handleChange}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: isMobile ? 'stretch' : 'flex-end',
              gap: 1,
              mt: 2,
              '& .MuiButton-root': {
                width: isMobile ? '100%' : 'auto',
                fontSize: isMobile ? '1rem' : '0.875rem',
                height: isMobile ? '44px' : '36px',
              },
            }}
          >
            <Button variant="outlined" onClick={onCancel}>
              {UA.common_cancel}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : UA.common_save}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default MeterReadingForm;
