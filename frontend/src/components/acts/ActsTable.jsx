import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  Grid,
} from '@mui/material';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PaymentIcon from '@mui/icons-material/Payment';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { useTheme } from '@mui/material/styles';
import { generateConsumptionAct } from '../../utils/excelGenerator';
import { UA } from '../../utils/uaDictionary';
import {
  CATEGORY_LABELS_SHORT,
  MONTHS,
  DEFAULT_ACT_OPTIONS,
  CONSUMPTION_LABELS,
  WATER_RESOURCES,
  RESOURCE_TYPES,
} from '../../constants';

const getDistributionByCategory = (reading, category) => {
  if (!reading.distributions || !Array.isArray(reading.distributions)) return null;
  return reading.distributions.find((d) => d.category === category);
};

const getMonthFromDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length >= 2) {
    return parts[1];
  }
  return null;
};

const MobileReadingCard = ({ reading, isWater, isGas }) => {
  const distributions = ['CA', 'CP', 'GR']
    .map((cat) => getDistributionByCategory(reading.rawReading, cat))
    .filter(Boolean);

  const rowsToRender =
    distributions.length > 0
      ? distributions
      : [
          {
            category: 'General',
            previous_reading: reading.rawReading.previous_reading,
            current_reading: reading.rawReading.current_reading,
            difference: reading.rawReading.consumption,
            consumed_energy: reading.rawReading.total_consumption,
            cost: reading.rawReading.total_cost,
          },
        ];

  return (
    <Card sx={{ mb: 2, boxShadow: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {UA.acts_meter_number}: <strong>{reading.meterNumber}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {reading.installationPlace}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {UA.acts_resource_type}: {reading.purpose}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              {UA.acts_coefficient}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {reading.coefficient}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              {UA.acts_area_percent}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {reading.locationArea}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {rowsToRender.map((dist, idx) => (
          <Box key={idx} sx={{ mb: idx < rowsToRender.length - 1 ? 2 : 0 }}>
            {!isWater && !isGas && dist.category !== 'General' && (
              <Chip
                label={CATEGORY_LABELS_SHORT[dist.category] || dist.category}
                size="small"
                color="primary"
                sx={{ mb: 1 }}
              />
            )}
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  {UA.acts_previous}
                </Typography>
                <Typography variant="body2">{dist.previous_reading || '0.00'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  {UA.acts_current}
                </Typography>
                <Typography variant="body2">{dist.current_reading || '0.00'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  {UA.acts_difference}
                </Typography>
                <Typography variant="body2">{dist.difference || '0.00'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {UA.acts_total_consumption}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {dist.consumed_energy || '0.00'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {UA.acts_cost}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {(parseFloat(dist.total_cost) || parseFloat(dist.cost) || 0).toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
            {idx < rowsToRender.length - 1 && <Divider sx={{ mt: 1.5 }} />}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

const ActsTable = () => {
  const { meterReadings, loading, error, fetchReadings, getReadingsSummary } = useMeterReadings();
  const [generating, setGenerating] = useState(false);
  const [selectedResource, setSelectedResource] = useState(RESOURCE_TYPES.electricity);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [summary, setSummary] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [actOptions, setActOptions] = useState({
    period: new Date().toISOString().split('T')[0],
    ...DEFAULT_ACT_OPTIONS,
  });

  useEffect(() => {
    fetchReadings();
    getReadingsSummary()
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [fetchReadings, getReadingsSummary, selectedResource]);

  const transformedReadings = useMemo(() => {
    if (!meterReadings) return [];

    return meterReadings.map((reading) => {
      const meterInfo = reading?.MeterTenant?.Meter;
      const locationInfo = meterInfo?.Location;
      const energyInfo = reading?.MeterTenant?.Meter?.EnergyResourceType;

      const prevValue = reading.previous_reading || '0.00';
      const currValue = reading.current_reading || '0.00';
      const difference = reading.consumption || '0.00';
      const coefficient = reading.calculation_coefficient || 'N/A';
      const occupiedArea = parseFloat(reading.location_occupied_area)?.toFixed(2) || '0.00';
      const readingDate = reading.reading_date || reading.act_date || '';

      return {
        id: reading.id,
        rawReading: reading,
        meterNumber: meterInfo?.serial_number || 'N/A',
        installationPlace: locationInfo?.name || UA.status_unknown_location,
        address: locationInfo?.address || '',
        purpose: energyInfo?.name || 'N/A',
        prevValue: prevValue,
        currValue: currValue,
        difference: difference,
        coefficient: coefficient,
        locationArea: occupiedArea,
        readingDate: readingDate,
      };
    });
  }, [meterReadings]);

  const filteredReadings = useMemo(() => {
    let filtered = transformedReadings;

    if (selectedResource) {
      filtered = filtered.filter((r) => {
        const purpose = (r.purpose || '').toLowerCase();
        const resource = selectedResource.toLowerCase();

        if (resource === RESOURCE_TYPES.waterAll.toLowerCase()) {
          return purpose.includes('вода');
        }

        if (resource === RESOURCE_TYPES.waterCold.toLowerCase()) {
          return purpose.includes('холод');
        }

        if (resource === RESOURCE_TYPES.waterHot.toLowerCase()) {
          return purpose.includes('гаряч');
        }

        return purpose === resource;
      });
    }

    if (selectedMonth) {
      filtered = filtered.filter((r) => getMonthFromDate(r.readingDate) === selectedMonth);
    }

    return filtered;
  }, [selectedResource, transformedReadings, selectedMonth]);

  const categorySummary = useMemo(() => {
    if (!filteredReadings.length) return { totalConsumption: 0, totalCost: 0, categories: {} };

    const summaryData = {
      totalConsumption: 0,
      totalCost: 0,
      categories: { CA: 0, CP: 0, GR: 0 },
    };

    filteredReadings.forEach((r) => {
      const distributions = ['CA', 'CP', 'GR']
        .map((cat) => getDistributionByCategory(r.rawReading, cat))
        .filter(Boolean);

      if (distributions.length > 0) {
        distributions.forEach((dist) => {
          const cost = parseFloat(dist.total_cost) || parseFloat(dist.cost) || 0;
          const consumption = parseFloat(dist.consumed_energy) || 0;

          if (dist.category) {
            summaryData.categories[dist.category] = (summaryData.categories[dist.category] || 0) + cost;
          }
          summaryData.totalCost += cost;
          summaryData.totalConsumption += consumption;
        });
      } else {
        const cost = parseFloat(r.rawReading.total_cost) || 0;
        const consumption = parseFloat(r.rawReading.total_consumption) || 0;
        summaryData.totalCost += cost;
        summaryData.totalConsumption += consumption;
      }
    });

    return summaryData;
  }, [filteredReadings]);

  const handleGenerateAct = async () => {
    if (filteredReadings.length === 0) {
      alert(UA.acts_no_data);
      return;
    }

    try {
      setGenerating(true);
      await generateConsumptionAct(filteredReadings, selectedResource, actOptions);
      setDialogOpen(false);
      alert(`✅ ${UA.acts_success}`);
    } catch (err) {
      alert(`❌ ${UA.acts_error}: ${err?.message || err}`);
    } finally {
      setGenerating(false);
    }
  };

  const isWater = WATER_RESOURCES.includes(selectedResource.toLowerCase());
  const isGas = selectedResource.toLowerCase() === RESOURCE_TYPES.gas.toLowerCase();

  let consumptionLabel = CONSUMPTION_LABELS.electricity;
  if (isWater) consumptionLabel = CONSUMPTION_LABELS.water;
  if (isGas) consumptionLabel = CONSUMPTION_LABELS.gas;

  const resourceButtons = [
    RESOURCE_TYPES.electricity,
    RESOURCE_TYPES.waterAll,
    RESOURCE_TYPES.waterCold,
    RESOURCE_TYPES.waterHot,
    RESOURCE_TYPES.gas,
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        mb={2}
      >
        <Typography variant={isMobile ? 'h5' : 'h4'}>{UA.acts_title}</Typography>
        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}>
          <Tooltip title={UA.acts_refresh_tooltip}>
            <IconButton onClick={fetchReadings} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={!isMobile && <FileDownloadIcon />}
            disabled={generating || filteredReadings.length === 0}
            onClick={() => setDialogOpen(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? UA.acts_short : generating ? UA.acts_generating : UA.acts_generate}
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Box sx={{ overflowX: 'auto', pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
            {resourceButtons.map((resource) => (
              <Button
                key={resource}
                variant={selectedResource === resource ? 'contained' : 'outlined'}
                onClick={() => setSelectedResource(resource)}
                size={isMobile ? 'small' : 'medium'}
              >
                {resource}
              </Button>
            ))}
          </Stack>
        </Box>

        <FormControl sx={{ minWidth: { xs: '100%', sm: 120 } }} size="small">
          <InputLabel id="month-select-label">{UA.acts_month}</InputLabel>
          <Select
            labelId="month-select-label"
            value={selectedMonth}
            label={UA.acts_month}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <MenuItem value="">{UA.common_all}</MenuItem>
            {MONTHS.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Typography color="error" mb={2} sx={{ bgcolor: '#ffebee', p: 2, borderRadius: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Typography>⏳ {UA.common_loading}</Typography>
        </Box>
      ) : isMobile ? (
        <Box>
          {filteredReadings.length > 0 ? (
            filteredReadings.map((r) => (
              <MobileReadingCard key={r.id} reading={r} isWater={isWater} isGas={isGas} theme={theme} />
            ))
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">{UA.acts_no_data_filters}</Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size={isTablet ? 'small' : 'small'} sx={{ minWidth: isTablet ? 1200 : 1500 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 100 }}>
                  {UA.acts_meter_number}
                </TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 150 }}>
                  {UA.acts_installation_place}
                </TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 120 }}>
                  {UA.acts_resource_type}
                </TableCell>
                {!isWater && !isGas && (
                  <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 80 }}>
                    {UA.acts_category}
                  </TableCell>
                )}
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 60 }}>
                  {UA.acts_coefficient}
                </TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 80 }}>
                  {UA.acts_area_percent}
                </TableCell>
                <TableCell colSpan={5} align="center" sx={{ fontWeight: 'bold', borderBottom: 0 }}>
                  {UA.acts_indicators}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 90 }}>
                  {UA.acts_previous}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 90 }}>
                  {UA.acts_current}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                  {UA.acts_difference}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                  {consumptionLabel}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover, minWidth: 100 }}
                >
                  {UA.acts_cost}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReadings.length > 0 ? (
                filteredReadings.map((r) => {
                  const distributions = ['CA', 'CP', 'GR']
                    .map((cat) => getDistributionByCategory(r.rawReading, cat))
                    .filter(Boolean);

                  const rowsToRender =
                    distributions.length > 0
                      ? distributions
                      : [
                          {
                            category: 'General',
                            previous_reading: r.rawReading.previous_reading,
                            current_reading: r.rawReading.current_reading,
                            difference: r.rawReading.consumption,
                            consumed_energy: r.rawReading.total_consumption,
                            cost: r.rawReading.total_cost,
                          },
                        ];

                  const rowCount = rowsToRender.length;

                  return rowsToRender.map((dist, distIndex) => (
                    <TableRow key={`${r.id}-${dist.category || 'general'}`} hover>
                      {distIndex === 0 && (
                        <>
                          <TableCell rowSpan={rowCount}>{r.meterNumber}</TableCell>
                          <TableCell rowSpan={rowCount}>{r.installationPlace}</TableCell>
                          <TableCell rowSpan={rowCount}>{r.purpose}</TableCell>
                        </>
                      )}
                      {!isWater && !isGas && (
                        <TableCell align="center">
                          {dist.category === 'General' ? (
                            UA.common_empty_dash
                          ) : (
                            <Chip
                              label={CATEGORY_LABELS_SHORT[dist.category] || dist.category}
                              size="small"
                              sx={{
                                backgroundColor: 'transparent',
                                border: `1.5px solid ${theme.palette.primary.main}`,
                                fontWeight: 'bold',
                              }}
                            />
                          )}
                        </TableCell>
                      )}
                      {distIndex === 0 && (
                        <>
                          <TableCell rowSpan={rowCount} align="right">
                            {r.coefficient}
                          </TableCell>
                          <TableCell rowSpan={rowCount} align="right">
                            {r.locationArea}
                          </TableCell>
                        </>
                      )}
                      <TableCell align="right">{dist.previous_reading || '0.00'}</TableCell>
                      <TableCell align="right">{dist.current_reading || '0.00'}</TableCell>
                      <TableCell align="right">{dist.difference || '0.00'}</TableCell>
                      <TableCell align="right">{dist.consumed_energy || '0.00'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {dist.total_cost || dist.cost || '0.00'}
                      </TableCell>
                    </TableRow>
                  ));
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    {UA.acts_no_data_filters}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>📄 {UA.acts_settings_title}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            <TextField
              label={UA.acts_period}
              type="month"
              value={actOptions.period.substring(0, 7)}
              onChange={(e) => setActOptions({ ...actOptions, period: e.target.value + '-01' })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText={UA.acts_period_help}
            />
            <TextField
              label={UA.acts_organization}
              value={actOptions.organization}
              onChange={(e) => setActOptions({ ...actOptions, organization: e.target.value })}
              fullWidth
              placeholder={DEFAULT_ACT_OPTIONS.organization}
            />
            <TextField
              label={UA.acts_tenant_company}
              value={actOptions.tenantCompany}
              onChange={(e) => setActOptions({ ...actOptions, tenantCompany: e.target.value })}
              fullWidth
              placeholder={DEFAULT_ACT_OPTIONS.tenantCompany}
            />
            <TextField
              label={UA.acts_address}
              value={actOptions.address}
              onChange={(e) => setActOptions({ ...actOptions, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder={DEFAULT_ACT_OPTIONS.address}
            />
            <TextField
              label={UA.acts_executor_title}
              value={actOptions.executorTitle}
              onChange={(e) => setActOptions({ ...actOptions, executorTitle: e.target.value })}
              fullWidth
              placeholder={DEFAULT_ACT_OPTIONS.executorTitle}
            />
            <TextField
              label={UA.acts_executor_name}
              value={actOptions.executorName}
              onChange={(e) => setActOptions({ ...actOptions, executorName: e.target.value })}
              fullWidth
              placeholder={DEFAULT_ACT_OPTIONS.executorName}
            />
            <TextField
              label={UA.acts_tenant_representative}
              value={actOptions.tenantRepresentative}
              onChange={(e) => setActOptions({ ...actOptions, tenantRepresentative: e.target.value })}
              fullWidth
              placeholder={DEFAULT_ACT_OPTIONS.tenantRepresentative}
            />
            <Box sx={{ bgcolor: '#f0f7ff', p: 2, borderRadius: 1, border: '1px solid #2196f3' }}>
              <Typography variant="body2" color="primary" gutterBottom>
                📊 {UA.acts_report_info}:
              </Typography>
              <Typography variant="body2">
                • {UA.acts_resource}: <strong>{selectedResource}</strong>
              </Typography>
              <Typography variant="body2">
                • {UA.acts_records_count}: <strong>{filteredReadings.length}</strong>
              </Typography>
              <Typography variant="body2">
                • {UA.acts_format}: <strong>{UA.acts_format_excel}</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#fafafa' }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {UA.common_cancel}
          </Button>
          <Button
            onClick={handleGenerateAct}
            variant="contained"
            disabled={generating}
            startIcon={<FileDownloadIcon />}
            sx={{ minWidth: { xs: 100, sm: 150 } }}
          >
            {generating ? UA.acts_generating : UA.acts_generate}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary */}
      <Box mt={3} p={{ xs: 1.5, sm: 2 }} component={Paper}>
        <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
          {UA.acts_summary}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {UA.filter_resource_type}: {selectedResource}
          {selectedMonth && ` | ${UA.acts_month}: ${MONTHS.find((m) => m.value === selectedMonth)?.label}`}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }} mb={2}>
          <Typography variant="body2">
            <BarChartOutlinedIcon
              sx={{ verticalAlign: 'middle', color: theme.palette.primary.main, mr: 0.5, fontSize: isMobile ? 18 : 20 }}
            />
            {UA.acts_total_records}: <strong>{filteredReadings?.length || 0}</strong>
          </Typography>
          <Typography variant="body2">
            <BoltOutlinedIcon
              sx={{ verticalAlign: 'middle', color: theme.palette.primary.main, mr: 0.5, fontSize: isMobile ? 18 : 20 }}
            />
            {UA.acts_total_consumption}: <strong>{categorySummary.totalConsumption.toFixed(2)}</strong>
          </Typography>
        </Stack>

        <Box mt={2}>
          <Typography variant={isMobile ? 'body2' : 'subtitle1'} fontWeight="bold" gutterBottom>
            <PaymentIcon
              sx={{ verticalAlign: 'middle', color: theme.palette.primary.main, mr: 0.5, fontSize: isMobile ? 18 : 20 }}
            />
            {UA.acts_total_cost_by_category}:
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }} mt={1}>
            {Object.keys(categorySummary.categories).map((cat) => {
              const cost = categorySummary.categories[cat];
              if (cost > 0) {
                return (
                  <Typography key={cat} component="div" variant="body2">
                    <Chip label={CATEGORY_LABELS_SHORT[cat]} size="small" color="primary" sx={{ mr: 0.5 }} />:
                    <strong> {cost.toFixed(2)}</strong>
                  </Typography>
                );
              }
              return null;
            })}
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {UA.acts_total}: {categorySummary.totalCost.toFixed(2)}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default ActsTable;
