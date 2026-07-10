import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  IconButton,
  Typography,
  Card,
  CardContent,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import useMediaQuery from '../../hooks/useMediaQuery';
import SearchField from '../ui/SearchField';
import { useTheme } from '@mui/material/styles';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, SIZES, TABLE_COLUMNS } from '../../constants';

const MobileMeterTenantCard = ({ meterTenant, onEdit, onDelete, isLoading, getTenantName, getMeterInfo }) => {
  const theme = useTheme();

  const tenantName = getTenantName(meterTenant.tenant_id);
  const meterInfo = getMeterInfo(meterTenant.meter_id);

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString('uk-UA') : UA.common_empty_dash;

  return (
    <Card sx={{ mb: 2, border: `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {UA.meterTenants_tenant}: <strong>{tenantName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {UA.meterTenants_meter}: {meterInfo.serial} ({meterInfo.resourceName})
          </Typography>
        </Box>
        <Typography variant="caption" display="block" color="text.secondary">
          {UA.meterReadings_reading_date}: {formatDate(meterTenant.assigned_from)} -{' '}
          {formatDate(meterTenant.assigned_to)}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Tooltip title={UA.common_edit}>
            <span>
              <IconButton size="small" onClick={() => onEdit(meterTenant)} color="primary" disabled={isLoading}>
                <Edit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={UA.common_delete}>
            <span>
              <IconButton size="small" onClick={() => onDelete(meterTenant.id)} color="error" disabled={isLoading}>
                {isLoading ? (
                  <CircularProgress size={SIZES.iconButton.small} color="inherit" />
                ) : (
                  <Delete fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

const MeterTenantsTable = ({
  meterTenants,
  tenants = [],
  meters = [],
  locations = [],
  resourceTypes = [],
  onEdit,
  onDelete,
  onAdd,
  search,
  setSearch,
  locationFilter,
  setLocationFilter,
  tenantFilter,
  setTenantFilter,
  isLoading,
  setLocalError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const [loadingItemId, setLoadingItemId] = useState(null);

  const tenantMap = useMemo(
    () =>
      tenants.reduce((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {}),
    [tenants]
  );

  const meterMap = useMemo(
    () =>
      meters.reduce((acc, m) => {
        const resourceType = resourceTypes.find((rt) => rt.id === m.energy_resource_type_id);
        acc[m.id] = {
          serial: m.serial_number || `ID:${m.id}`,
          locationId: m.location_id,
          resourceName: resourceType?.name || UA.status_unknown_resource,
          unit: resourceType?.unit || '?',
        };
        return acc;
      }, {}),
    [meters, resourceTypes]
  );

  const locationMap = useMemo(
    () =>
      locations.reduce((acc, l) => {
        acc[l.id] = l.name;
        return acc;
      }, {}),
    [locations]
  );

  const getTenantName = useCallback((tenantId) => tenantMap[tenantId] || `ID: ${tenantId}`, [tenantMap]);

  const getMeterInfo = useCallback(
    (meterId) => meterMap[meterId] || { serial: `ID: ${meterId}`, locationId: null, resourceName: '?', unit: '?' },
    [meterMap]
  );

  const filteredMeterTenants = useMemo(
    () =>
      meterTenants.filter((mt) => {
        const meterInfo = getMeterInfo(mt.meter_id);
        const tenantName = getTenantName(mt.tenant_id).toLowerCase();
        const meterSerial = meterInfo.serial.toLowerCase();
        const locationId = meterInfo.locationId;
        const query = search.toLowerCase();

        const locFilterNum = locationFilter ? parseInt(locationFilter) : null;
        const tenantFilterNum = tenantFilter ? parseInt(tenantFilter) : null;

        const locationMatch = !locFilterNum || locationId === locFilterNum;
        const tenantMatch = !tenantFilterNum || mt.tenant_id === tenantFilterNum;
        const locationName = (locationMap[locationId] || '').toLowerCase(); // Отримуємо назву локації
        const searchMatch =
          query === '' || tenantName.includes(query) || meterSerial.includes(query) || locationName.includes(query);

        return locationMatch && tenantMatch && searchMatch;
      }),
    [meterTenants, search, locationFilter, tenantFilter, getMeterInfo, getTenantName]
  );

  const formatDate = (dateString) => {
    if (!dateString) return UA.common_empty_dash;
    try {
      return new Date(dateString).toLocaleDateString('uk-UA');
    } catch {
      return 'Invalid Date';
    }
  };

  const handleDeleteClick = async (id) => {
    setLoadingItemId(id);
    try {
      await onDelete(id);
    } catch (e) {
      const userMessage = translateErrorMessage(e.message || UA.error_delete_meter_tenant);
      setLocalError(userMessage);
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            onClick={onAdd}
            fullWidth={isMobile}
            sx={{
              minWidth: isMobile ? 'auto' : SIZES.button.minWidth,
              height: SIZES.button.height,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              order: isMobile ? 1 : 0,
            }}
            disabled={isLoading}
          >
            {UA.meterTenants_add}
          </Button>
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth={isMobile}
            placeholder={UA.common_search}
            sx={{ width: isMobile ? '100%' : SIZES.searchField.desktop, maxWidth: '100%', order: isMobile ? 0 : 1 }}
            disabled={isLoading}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
          <FormControl fullWidth size="small" disabled={isLoading}>
            <InputLabel>{UA.filter_location}</InputLabel>
            <Select
              value={locationFilter}
              label={UA.filter_location}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>{UA.filter_all_locations}</em>
              </MenuItem>
              {locations
                .filter((l) => l.isActive)
                .map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" disabled={isLoading}>
            <InputLabel>{UA.meterTenants_tenant}</InputLabel>
            <Select
              value={tenantFilter}
              label={UA.meterTenants_tenant}
              onChange={(e) => setTenantFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>{UA.locations_all_tenants}</em>
              </MenuItem>
              {tenants
                .filter((t) => t.isActive)
                .map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {(search || locationFilter || tenantFilter) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {UA.common_found}: {filteredMeterTenants.length} {UA.common_of} {meterTenants.length}
        </Typography>
      )}

      {isMobile ? (
        <Box>
          {filteredMeterTenants.length > 0 ? (
            filteredMeterTenants.map((mt) => (
              <MobileMeterTenantCard
                key={mt.id}
                meterTenant={mt}
                onEdit={onEdit}
                onDelete={handleDeleteClick}
                isLoading={isLoading || loadingItemId === mt.id}
                getTenantName={getTenantName}
                getMeterInfo={getMeterInfo}
              />
            ))
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" align="center" color="text.secondary">
                  {UA.common_no_results}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.resourceType, fontWeight: 600 }}>
                  {UA.meterTenants_tenant}
                </TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.resourceType, fontWeight: 600 }}>
                  {UA.meterTenants_meter}
                </TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 600 }}>{UA.filter_location}</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 600 }}>{UA.meterTenants_start_date}</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 600 }}>{UA.meterTenants_end_date}</TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.actions, fontWeight: 600, textAlign: 'center' }}>
                  {UA.meters_actions}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMeterTenants.length > 0 ? (
                filteredMeterTenants.map((mt) => {
                  const meterInfo = getMeterInfo(mt.meter_id);
                  const locationName = locationMap[meterInfo.locationId] || '?';
                  const isLoadingRow = loadingItemId === mt.id;
                  const isDisabled = isLoading || isLoadingRow;

                  return (
                    <TableRow key={mt.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {getTenantName(mt.tenant_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {meterInfo.serial}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {meterInfo.resourceName} ({meterInfo.unit})
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {locationName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(mt.assigned_from)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={mt.assigned_to ? 'text.secondary' : 'text.primary'}>
                          {formatDate(mt.assigned_to)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0} justifyContent="center">
                          <Tooltip title={UA.common_edit}>
                            <span>
                              <IconButton size="small" onClick={() => onEdit(mt)} color="primary" disabled={isDisabled}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={UA.common_delete}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(mt.id)}
                                color="error"
                                disabled={isDisabled}
                              >
                                {isLoadingRow ? (
                                  <CircularProgress size={SIZES.iconButton.small} color="inherit" />
                                ) : (
                                  <Delete fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {UA.common_no_results}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MeterTenantsTable;
