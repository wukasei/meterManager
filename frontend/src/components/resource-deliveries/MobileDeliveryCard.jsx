import { Card, CardContent, Box, Typography, IconButton, Stack, Tooltip, Divider } from '@mui/material';
import { Edit, Delete, LocationOn } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { UA } from '../../utils/uaDictionary';
const MobileDeliveryCard = ({
  delivery,
  onEdit,
  onDelete,
  getLocationName,
  getResourceTypeName,
  getTotalCost,
  getPricePerUnit,
  isLoading,
}) => {
  const theme = useTheme();

  const safeNumber = (value) => Number(value) || 0;

  const formattedQuantity = safeNumber(delivery.quantity).toFixed(4);

  const formattedPricePerUnit = safeNumber(getPricePerUnit(delivery)).toFixed(2);

  const formattedTotalCost = safeNumber(getTotalCost(delivery)).toFixed(2).toLocaleString('uk-UA');

  const formattedDate = delivery.delivery_date
    ? new Date(delivery.delivery_date).toLocaleDateString('uk-UA')
    : UA.common_empty_dash;

  return (
    <Card
      sx={{
        mb: 1.5,
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        backgroundColor: 'white',
      }}
    >
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}
          >
            {getResourceTypeName(delivery.energy_resource_type_id)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              ml: 1,
            }}
          >
            {formattedDate}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <LocationOn sx={{ fontSize: '16px', color: 'grey.500', mr: 0.5 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 500 }}>
            {getLocationName(delivery)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5, borderColor: 'grey.100' }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}
            >
              {UA.deliveries_quantity}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
              {formattedQuantity} {delivery.unit}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}
            >
              {UA.deliveries_total_sum}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.875rem' }}>
              {formattedTotalCost} ₴
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}
            >
              {UA.deliveries_price_per_unit}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.875rem' }}>
              {formattedPricePerUnit} ₴
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}
            >
              {UA.deliveries_supplier}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {delivery.supplier || UA.deliveries_supplier_not_specified}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 1.5, borderColor: 'grey.100' }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title={UA.common_edit}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onEdit(delivery)}
                  color="primary"
                  sx={{
                    width: 32,
                    height: 32,
                    border: `1px solid ${theme.palette.grey[300]}`,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                  disabled={isLoading}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={UA.common_delete}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onDelete(delivery.id)}
                  color="error"
                  sx={{
                    width: 32,
                    height: 32,
                    border: `1px solid ${theme.palette.grey[300]}`,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: theme.palette.error.light,
                      borderColor: theme.palette.error.main,
                    },
                  }}
                  disabled={isLoading}
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

export default MobileDeliveryCard;
