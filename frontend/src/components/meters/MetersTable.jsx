import { useState } from 'react';
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
  Switch,
  IconButton,
  Chip,
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
import { BREAKPOINTS, TABLE_COLUMNS, SIZES, FORM_FIELDS } from '../../constants';

const MetersTable = ({
  meters,
  onEdit,
  onAdd,
  removeMeter,
  updateMeterStatus,
  setLocalError,
  locations = [],
  energyResourceTypes = [],
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [loadingMeterId, setLoadingMeterId] = useState(null);

  const handleActionFailure = (err) => {
    const userMessage = translateErrorMessage(err.message || UA.error_action_failed);
    setLocalError?.(userMessage);
  };

  const handleStatusChange = async (meter) => {
    if (isLoading || loadingMeterId !== null) return;

    setLoadingMeterId(meter.id);
    try {
      await updateMeterStatus(meter.id, !meter.isActive);
    } catch (err) {
      handleActionFailure(err);
    } finally {
      setLoadingMeterId(null);
    }
  };

  const handleRemoveClick = (meterId) => {
    removeMeter(meterId);
  };

  const getLocationName = (locationId) =>
    locations.find((l) => l.id === locationId)?.name || UA.status_unknown_location;
  const getResourceName = (resourceId) =>
    energyResourceTypes.find((rt) => rt.id === resourceId)?.name || UA.status_unknown_resource;

  const filteredMeters = meters.filter((meter) => {
    const serial = (meter.serial_number || '').toLowerCase();
    const locationName = getLocationName(meter.location_id).toLowerCase();
    const resourceName = getResourceName(meter.energy_resource_type_id).toLowerCase();
    const query = search.toLowerCase();

    const locationMatch = !selectedLocation || meter.location_id === selectedLocation;
    const resourceTypeMatch = !selectedResourceType || meter.energy_resource_type_id === selectedResourceType;

    const searchMatch =
      query === '' || serial.includes(query) || locationName.includes(query) || resourceName.includes(query);

    return locationMatch && resourceTypeMatch && searchMatch;
  });

  const MobileMeterCard = ({ meter }) => {
    const isRowLoading = loadingMeterId === meter.id;

    return (
      <Card sx={theme.mixins.card}>
        <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {meter.serial_number}
            </Typography>
            <Chip
              label={meter.isActive ? UA.status_active : UA.status_inactive}
              color={meter.isActive ? 'success' : 'default'}
              size="small"
              sx={theme.mixins.chipStatus}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>{UA.meters_location}:</strong> {getLocationName(meter.location_id)}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>{UA.meters_resource_type}:</strong> {getResourceName(meter.energy_resource_type_id)}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isRowLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Switch
                  checked={meter.isActive}
                  onChange={() => handleStatusChange(meter)}
                  color="primary"
                  size="small"
                  disabled={isLoading || loadingMeterId !== null}
                />
              )}
              <Typography variant="body2">{meter.isActive ? UA.status_active : UA.status_inactive}</Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Tooltip title={UA.common_edit}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(meter)}
                    color="primary"
                    disabled={isLoading || loadingMeterId !== null}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={meter.isActive ? UA.meters_deactivate_first : UA.common_delete}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveClick(meter.id)}
                    color="error"
                    disabled={meter.isActive || isLoading || loadingMeterId !== null}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Button variant="contained" onClick={onAdd} sx={theme.mixins.buttonPrimary} disabled={isLoading}>
            {UA.meters_add}
          </Button>

          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={UA.common_search}
            sx={theme.mixins.searchField}
            disabled={isLoading}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <FormControl
            size={FORM_FIELDS.select.size}
            sx={{ minWidth: FORM_FIELDS.select.minWidth, flexGrow: 1 }}
            disabled={isLoading}
          >
            <InputLabel>{UA.meters_location}</InputLabel>
            <Select
              value={selectedLocation}
              label={UA.meters_location}
              onChange={(e) => setSelectedLocation(e.target.value)}
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

          <FormControl
            size={FORM_FIELDS.select.size}
            sx={{ minWidth: FORM_FIELDS.select.minWidth, flexGrow: 1 }}
            disabled={isLoading}
          >
            <InputLabel>{UA.meters_resource_type}</InputLabel>
            <Select
              value={selectedResourceType}
              label={UA.meters_resource_type}
              onChange={(e) => setSelectedResourceType(e.target.value)}
            >
              <MenuItem value="">
                <em>{UA.filter_all_types}</em>
              </MenuItem>
              {energyResourceTypes
                .filter((rt) => rt.isActive)
                .map((rt) => (
                  <MenuItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {(search || selectedLocation || selectedResourceType) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {UA.common_found}: {filteredMeters.length} {UA.common_of} {meters.length}
        </Typography>
      )}

      {isMobile ? (
        <Box>
          {filteredMeters.length > 0 ? (
            filteredMeters.map((meter) => (
              <MobileMeterCard key={meter.id} meter={meter} isLoading={isLoading || loadingMeterId === meter.id} />
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
                <TableCell sx={{ width: TABLE_COLUMNS.meters.serialNumber, fontWeight: 600 }}>
                  {UA.meters_serial_number}
                </TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.location, fontWeight: 600 }}>
                  {UA.meters_location}
                </TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.resourceType, fontWeight: 600 }}>
                  {UA.meters_resource_type}
                </TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.status, fontWeight: 600 }}>{UA.meters_status}</TableCell>
                <TableCell sx={{ width: TABLE_COLUMNS.meters.actions, fontWeight: 600, textAlign: 'center' }}>
                  {UA.meters_actions}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMeters.length > 0 ? (
                filteredMeters.map((meter) => {
                  const isRowLoading = loadingMeterId === meter.id;
                  const isDisabled = isLoading || loadingMeterId !== null;

                  return (
                    <TableRow key={meter.id} sx={theme.mixins.tableRow}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {meter.serial_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {getLocationName(meter.location_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {getResourceName(meter.energy_resource_type_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isRowLoading ? (
                            <CircularProgress size={SIZES.circularProgress.small} />
                          ) : (
                            <Switch
                              checked={meter.isActive}
                              onChange={() => handleStatusChange(meter)}
                              color="primary"
                              size="small"
                              disabled={isDisabled}
                            />
                          )}
                          <Chip
                            label={meter.isActive ? UA.status_active : UA.status_inactive}
                            color={meter.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0} justifyContent="center">
                          <Tooltip title={UA.meters_edit_tooltip}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => onEdit(meter)}
                                color="primary"
                                disabled={isDisabled}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={meter.isActive ? UA.meters_deactivate_first : UA.meters_delete_tooltip}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveClick(meter.id)}
                                disabled={meter.isActive || isDisabled}
                                color="error"
                              >
                                <Delete fontSize="small" />
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
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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

export default MetersTable;
