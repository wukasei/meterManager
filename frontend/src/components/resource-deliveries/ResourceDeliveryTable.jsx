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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import useMediaQuery from '../../hooks/useMediaQuery';
import SearchField from '../ui/SearchField';
import CustomDatePicker from '../ui/DatePicker';
import { useTheme } from '@mui/material/styles';
import MobileDeliveryCard from './MobileDeliveryCard';
import { UA } from '../../utils/uaDictionary';

const safeToFixed = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return num.toFixed(decimals);
};

const ResourceDeliveryTable = ({
  deliveries,
  search,
  setSearch,
  locationFilter,
  setLocationFilter,
  resourceTypeFilter,
  setResourceTypeFilter,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  onEdit,
  onAdd,
  removeDelivery,
  locations = [],
  resourceTypes = [],
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:800px)');
  const isTablet = useMediaQuery('(max-width:960px)');

  const getLocationName = (delivery) => {
    if (delivery.locationName) return delivery.locationName;
    const location = locations.find((loc) => loc.id === delivery.location_id);
    return location ? location.name : UA.status_unknown_location;
  };

  const getResourceTypeName = (resourceTypeId) => {
    const resourceType = resourceTypes.find((rt) => rt.id === resourceTypeId);
    return resourceType ? `${resourceType.name} (${resourceType.unit})` : UA.status_unknown_resource;
  };

  const getTotalCost = (delivery) => {
    const cost =
      delivery.total_cost || delivery.totalCost || Number(delivery.quantity) * Number(delivery.price_per_unit) || 0;
    return cost;
  };

  const getPricePerUnit = (delivery) => {
    return delivery.price_per_unit || delivery.pricePerUnit || 0;
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const deliveryDate = new Date(d.delivery_date);
    deliveryDate.setHours(0, 0, 0, 0);

    const dateFrom = dateFromFilter ? new Date(dateFromFilter) : null;
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);

    const dateTo = dateToFilter ? new Date(dateToFilter) : null;
    if (dateTo) dateTo.setHours(0, 0, 0, 0);

    const locationMatch = locationFilter === '' || d.location_id === Number(locationFilter);
    const resourceTypeMatch = resourceTypeFilter === '' || d.energy_resource_type_id === Number(resourceTypeFilter);

    const dateFromMatch = !dateFrom || deliveryDate.getTime() >= dateFrom.getTime();
    const dateToMatch = !dateTo || deliveryDate.getTime() <= dateTo.getTime();

    const locationName = getLocationName(d).toLowerCase();
    const resourceName = getResourceTypeName(d.energy_resource_type_id).toLowerCase();
    const supplier = (d.supplier || '').toLowerCase();
    const searchLower = search.toLowerCase();

    const searchMatch =
      searchLower === '' ||
      resourceName.includes(searchLower) ||
      locationName.includes(searchLower) ||
      supplier.includes(searchLower);

    return locationMatch && resourceTypeMatch && dateFromMatch && dateToMatch && searchMatch;
  });

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
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="contained"
            onClick={onAdd}
            fullWidth={isMobile}
            sx={{
              minWidth: isMobile ? 'auto' : '160px',
              height: '40px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            disabled={isLoading}
          >
            {UA.deliveries_add}
          </Button>

          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth={isMobile}
            placeholder={UA.common_search}
            sx={{
              width: isMobile ? '100%' : '350px',
              maxWidth: isMobile ? '100%' : '400px',
              flexShrink: 1,
            }}
            disabled={isLoading}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <FormControl fullWidth size="small" disabled={isLoading}>
            <InputLabel>{UA.deliveries_location}</InputLabel>
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              label={UA.deliveries_location}
            >
              <MenuItem value="">{UA.deliveries_all_locations}</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={isLoading}>
            <InputLabel>{UA.deliveries_resource_type}</InputLabel>
            <Select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              label={UA.deliveries_resource_type}
            >
              <MenuItem value="">{UA.deliveries_all_resources}</MenuItem>
              {resourceTypes.map((res) => (
                <MenuItem key={res.id} value={res.id}>
                  {res.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <CustomDatePicker
            label={UA.deliveries_date_from}
            value={dateFromFilter}
            onChange={(newValue) => setDateFromFilter(newValue)}
            disabled={isLoading}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />

          <CustomDatePicker
            label={UA.deliveries_date_to}
            value={dateToFilter}
            onChange={(newValue) => setDateToFilter(newValue)}
            disabled={isLoading}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Box>
      </Box>

      {(search || locationFilter || resourceTypeFilter || dateFromFilter || dateToFilter) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0, fontWeight: 500 }}>
          {UA.common_found}: {filteredDeliveries.length} {UA.common_of} {deliveries.length}
        </Typography>
      )}

      {isMobile ? (
        <Box sx={{ mt: 0 }}>
          {filteredDeliveries.length > 0 ? (
            filteredDeliveries.map((delivery) => (
              <MobileDeliveryCard
                key={delivery.id}
                delivery={delivery}
                onEdit={onEdit}
                onDelete={removeDelivery}
                getLocationName={getLocationName}
                getResourceTypeName={getResourceTypeName}
                getTotalCost={getTotalCost}
                getPricePerUnit={getPricePerUnit}
                isLoading={isLoading}
              />
            ))
          ) : (
            <Card sx={{ border: `1px solid ${theme.palette.grey[300]}`, borderRadius: 1, boxShadow: 'none' }}>
              <CardContent sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {UA.common_no_results}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 1, overflowX: 'auto', mt: 0 }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                <TableCell sx={{ width: isTablet ? '12%' : '15%', fontWeight: 600 }}>
                  {UA.deliveries_location}
                </TableCell>
                <TableCell sx={{ width: isTablet ? '12%' : '15%', fontWeight: 600 }}>
                  {UA.deliveries_resource_type}
                </TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 600 }}>{UA.deliveries_quantity}</TableCell>
                <TableCell sx={{ width: isTablet ? '8%' : '10%', fontWeight: 600 }}>{UA.deliveries_unit}</TableCell>
                <TableCell sx={{ width: isTablet ? '12%' : '15%', fontWeight: 600 }}>
                  {UA.deliveries_delivery_date}
                </TableCell>
                <TableCell sx={{ width: '11%', fontWeight: 600 }}>{UA.deliveries_price_per_unit}</TableCell>
                <TableCell sx={{ width: '12%', fontWeight: 600 }}>{UA.deliveries_total_sum}</TableCell>
                <TableCell sx={{ width: '10%', fontWeight: 600 }}>{UA.deliveries_supplier}</TableCell>
                <TableCell sx={{ width: '5%', fontWeight: 600, textAlign: 'center' }}>
                  {UA.deliveries_actions}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getLocationName(delivery)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getResourceTypeName(delivery.energy_resource_type_id)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {safeToFixed(delivery.quantity, 4)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {delivery.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(delivery.delivery_date).toLocaleDateString('uk-UA')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {safeToFixed(getPricePerUnit(delivery))} ₴
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {safeToFixed(getTotalCost(delivery))} ₴
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {delivery.supplier || UA.common_empty_dash}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Stack direction="row" spacing={0} justifyContent="center">
                        <Tooltip title={UA.deliveries_edit_tooltip}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onEdit(delivery)}
                              color="primary"
                              disabled={isLoading}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={UA.deliveries_delete_tooltip}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => removeDelivery(delivery.id)}
                              color="error"
                              disabled={isLoading}
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
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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

export default ResourceDeliveryTable;
