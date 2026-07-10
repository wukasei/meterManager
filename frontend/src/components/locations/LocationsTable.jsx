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
  InputLabel,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import useMediaQuery from '../../hooks/useMediaQuery';
import SearchField from '../ui/SearchField';
import { useTheme } from '@mui/material/styles';
import { UA } from '../../utils/uaDictionary';
import { BREAKPOINTS, FORM_FIELDS } from '../../constants';

const LocationsTable = ({
  locations,
  tenants = [],
  tenantFilter,
  search,
  setTenantFilter,
  setSearch,
  onEdit,
  onAdd,
  onRemove,
  onStatusChange,
  setLocalError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.mobileWide);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const handleActionError = (err) => {
    const message = err.message || UA.error_action_default;
    setLocalError(message);
  };

  const handleStatusChange = async (location) => {
    try {
      await onStatusChange(location.id, !location.isActive);
    } catch (err) {
      handleActionError(err);
    }
  };

  const handleRemove = async (id) => {
    try {
      await onRemove(id);
    } catch (err) {
      handleActionError(err);
    }
  };

  const filteredLocations = locations
    .filter((loc) => {
      if (tenantFilter === '') return true;
      if (tenantFilter === 'null') return !loc.tenant?.id;
      return loc.tenant?.id === parseInt(tenantFilter);
    })
    .filter((loc) => {
      const searchText = search.toLowerCase();
      return (
        (loc.name || '').toLowerCase().includes(searchText) ||
        (loc.address || '').toLowerCase().includes(searchText) ||
        (loc.tenant?.name || '— вільна —').toLowerCase().includes(searchText)
      );
    });

  const MobileLocationCard = ({ location }) => (
    <Card sx={theme.mixins.card}>
      <CardContent sx={theme.mixins.cardContent}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={theme.mixins.mobileCardTitle}>
              {location.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {location.address}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {UA.locations_area_percent}:{' '}
              {location.occupied_area ? `${location.occupied_area}${UA.common_percent}` : UA.common_empty_dash}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {UA.locations_tenant}:{' '}
              <strong>{location.tenant ? location.tenant.name : UA.locations_tenant_free}</strong>
            </Typography>
          </Box>

          <Chip
            label={location.isActive ? UA.locations_status_active_f : UA.locations_status_inactive_f}
            color={location.isActive ? 'success' : 'default'}
            size="small"
            sx={theme.mixins.chipStatus}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={location.isActive}
              onChange={() => handleStatusChange(location)}
              color="primary"
              size="small"
            />
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title={UA.common_edit}>
              <IconButton size="small" onClick={() => onEdit(location)} color="primary">
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={location.isActive ? UA.locations_deactivate_first : UA.common_delete}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(location.id)}
                  color="error"
                  disabled={location.isActive}
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

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: isMobile ? 'stretch' : 'space-between',
          mb: 3,
        }}
      >
        <Button variant="contained" onClick={onAdd} fullWidth={isMobile} sx={theme.mixins.buttonPrimary}>
          {UA.locations_add}
        </Button>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexDirection: isMobile ? 'column' : 'row',
            width: '100%',
          }}
        >
          <FormControl
            variant="outlined"
            size={FORM_FIELDS.select.size}
            sx={{
              width: isMobile ? '100%' : '200px',
              flexShrink: 0,
            }}
          >
            <InputLabel>{UA.locations_tenant}</InputLabel>
            <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} label={UA.locations_tenant}>
              <MenuItem value="">{UA.locations_all_tenants}</MenuItem>
              <MenuItem value="null">{UA.locations_free_locations}</MenuItem>
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{
              width: '100%',
              maxWidth: '100%',
            }}
          />
        </Box>
      </Box>

      {search && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {UA.common_found}: {filteredLocations.length} {UA.common_of} {locations.length}
        </Typography>
      )}

      {isMobile ? (
        <Box>
          {filteredLocations.length > 0 ? (
            filteredLocations.map((location) => <MobileLocationCard key={location.id} location={location} />)
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" align="center" color="text.secondary">
                  {search ? UA.locations_not_found_search : UA.locations_not_found}
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
                <TableCell sx={{ width: isTablet ? '20%' : '18%', fontWeight: 600 }}>{UA.locations_name}</TableCell>
                <TableCell sx={{ width: isTablet ? '30%' : '32%', fontWeight: 600 }}>{UA.locations_address}</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 600 }}>{UA.locations_occupied_area}</TableCell>
                <TableCell sx={{ width: '20%', fontWeight: 600 }}>{UA.locations_tenant}</TableCell>
                <TableCell sx={{ width: isTablet ? '20%' : '20%', fontWeight: 600 }}>{UA.meters_status}</TableCell>
                <TableCell sx={{ width: '5%', fontWeight: 600 }}>{UA.meters_actions}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <TableRow key={loc.id} sx={theme.mixins.tableRow}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {loc.name}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {loc.address}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {loc.occupied_area ? `${loc.occupied_area}${UA.common_percent}` : UA.common_empty_dash}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{loc.tenant ? loc.tenant.name : UA.locations_tenant_free}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch
                          checked={loc.isActive}
                          onChange={() => handleStatusChange(loc)}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={loc.isActive ? UA.locations_status_active_f : UA.locations_status_inactive_f}
                          color={loc.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={UA.locations_edit_tooltip}>
                          <IconButton size="small" onClick={() => onEdit(loc)} color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={loc.isActive ? UA.locations_deactivate_first : UA.locations_delete_tooltip}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRemove(loc.id)}
                              disabled={loc.isActive}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {search ? UA.locations_not_found_search : UA.locations_not_found}
                    </Typography>
                    {!search && (
                      <Button variant="outlined" onClick={onAdd} sx={{ mt: 2 }}>
                        {UA.locations_add_first}
                      </Button>
                    )}
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

export default LocationsTable;
