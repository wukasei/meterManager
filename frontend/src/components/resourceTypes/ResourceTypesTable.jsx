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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import useMediaQuery from '../../hooks/useMediaQuery';
import SearchField from '../ui/SearchField';
import { useTheme } from '@mui/material/styles';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';

const ResourceTypesTable = ({
  resourceTypes,
  search,
  setSearch,
  onEdit,
  onAdd,
  onRemove,
  onStatusChange,
  setLocalError,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:800px)');
  const isTablet = useMediaQuery('(max-width:960px)');

  const handleStatusChange = async (type) => {
    try {
      await onStatusChange(type.id, !type.isActive);
    } catch (err) {
      const userMessage = translateErrorMessage(err.message);
      setLocalError(userMessage);
    }
  };

  const handleRemove = async (id) => {
    try {
      await onRemove(id);
    } catch (err) {
      const userMessage = translateErrorMessage(err.message);
      setLocalError(userMessage);
    }
  };

  const filteredTypes = (resourceTypes || []).filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.unit.toLowerCase().includes(search.toLowerCase())
  );

  const MobileResourceTypeCard = ({ resourceType }) => (
    <Card
      sx={{
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {resourceType.name}
          </Typography>
          <Chip
            label={resourceType.isActive ? UA.status_active : UA.status_inactive}
            color={resourceType.isActive ? 'success' : 'default'}
            size="small"
            sx={{ ml: 1, flexShrink: 0 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>{UA.resourceTypes_unit_label}:</strong> {resourceType.unit}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={resourceType.isActive}
              onChange={() => handleStatusChange(resourceType)}
              color="primary"
              size="small"
              disabled={isLoading}
            />
            <Typography variant="body2">{resourceType.isActive ? UA.status_active : UA.status_inactive}</Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title={UA.common_edit}>
              <IconButton size="small" onClick={() => onEdit(resourceType)} color="primary" disabled={isLoading}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={resourceType.isActive ? UA.resourceTypes_cannot_delete_active : UA.common_delete}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(resourceType.id)}
                  color="error"
                  disabled={resourceType.isActive || isLoading}
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
        <Button
          variant="contained"
          onClick={onAdd}
          fullWidth={isMobile}
          disabled={isLoading}
          sx={{
            minWidth: isMobile ? 'auto' : '160px',
            height: '40px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {UA.resourceTypes_add}
        </Button>

        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth={isMobile}
          placeholder={UA.resourceTypes_search_placeholder}
          sx={{
            width: isMobile ? '100%' : '350px',
            maxWidth: isMobile ? '100%' : '400px',
            flexShrink: 1,
          }}
          disabled={isLoading}
        />
      </Box>

      {search && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {UA.common_found}: {filteredTypes.length} {UA.common_of} {resourceTypes?.length || 0}
        </Typography>
      )}

      {isMobile ? (
        <Box>
          {filteredTypes.length > 0 ? (
            filteredTypes.map((resourceType) => (
              <MobileResourceTypeCard key={resourceType.id} resourceType={resourceType} />
            ))
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" align="center" color="text.secondary">
                  {search ? UA.resourceTypes_not_found_search : UA.resourceTypes_not_found}
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
                <TableCell sx={{ width: isTablet ? '35%' : '30%', fontWeight: 600 }}>{UA.resourceTypes_name}</TableCell>
                <TableCell sx={{ width: isTablet ? '35%' : '30%', fontWeight: 600 }}>{UA.resourceTypes_unit}</TableCell>
                <TableCell sx={{ width: isTablet ? '20%' : '20%', fontWeight: 600 }}>{UA.meters_status}</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 600 }}>{UA.meters_actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTypes.length > 0 ? (
                filteredTypes.map((type) => (
                  <TableRow key={type.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {type.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {type.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch
                          checked={type.isActive}
                          onChange={() => handleStatusChange(type)}
                          color="primary"
                          size="small"
                          disabled={isLoading}
                        />
                        <Chip
                          label={type.isActive ? UA.status_active : UA.status_inactive}
                          color={type.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={UA.resourceTypes_edit_tooltip}>
                          <IconButton size="small" onClick={() => onEdit(type)} color="primary" disabled={isLoading}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={type.isActive ? UA.resourceTypes_deactivate_first : UA.resourceTypes_delete_tooltip}
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRemove(type.id)}
                              disabled={type.isActive || isLoading}
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
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {search ? UA.resourceTypes_not_found_search : UA.resourceTypes_not_found}
                    </Typography>
                    {!search && (
                      <Button variant="outlined" onClick={onAdd} sx={{ mt: 2 }} disabled={isLoading}>
                        {UA.resourceTypes_add_first}
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

export default ResourceTypesTable;
