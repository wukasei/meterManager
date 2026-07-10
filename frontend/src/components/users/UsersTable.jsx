import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Switch,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import useMediaQuery from '../../hooks/useMediaQuery';
import SearchField from '../ui/SearchField';
import { useTheme } from '@mui/material/styles';
import MobileUserCard from './MobileUserCard';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';

const UsersTable = ({ users, search, setSearch, updateUserStatus, currentUserId, isLoading, setLocalError }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loadingUserId, setLoadingUserId] = useState(null);

  const handleStatusChange = async (u) => {
    setLoadingUserId(u.id);
    try {
      await updateUserStatus(u.id, !u.isActive);
    } catch (err) {
      const userMessage = translateErrorMessage(err.message || UA.users_status_error);
      setLocalError?.(userMessage);
    } finally {
      setLoadingUserId(null);
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase()) && u.role !== 'admin'),
    [users, search]
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'flex-end',
          mb: 3,
        }}
      >
        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth={isMobile}
          placeholder={UA.users_search_placeholder}
          sx={{
            width: isMobile ? '100%' : '350px',
            maxWidth: '100%',
          }}
          disabled={isLoading}
        />
      </Box>

      {search && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {UA.common_found}: {filteredUsers.length} {UA.common_of} {users.filter((u) => u.role !== 'admin').length}
        </Typography>
      )}

      {isMobile ? (
        <Box>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((userItem) => (
              <MobileUserCard
                key={userItem.id}
                user={userItem}
                onToggleStatus={() => handleStatusChange(userItem)}
                disabled={isLoading || loadingUserId !== null || userItem.auth0_user_id === currentUserId}
                isLoading={loadingUserId === userItem.id}
              />
            ))
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" align="center" color="text.secondary">
                  {search ? UA.users_not_found_search : UA.users_not_found}
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
                <TableCell sx={{ width: '40%', fontWeight: 600 }}>{UA.users_full_name}</TableCell>
                <TableCell sx={{ width: '30%', fontWeight: 600 }}>{UA.users_role}</TableCell>
                <TableCell sx={{ width: '30%', fontWeight: 600 }}>{UA.users_status}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {u.full_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {u.role}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {loadingUserId === u.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Switch
                            checked={u.isActive}
                            onChange={() => handleStatusChange(u)}
                            color="primary"
                            size="small"
                            disabled={isLoading || loadingUserId !== null || u.auth0_user_id === currentUserId}
                          />
                        )}
                        <Chip
                          label={u.isActive ? UA.status_active : UA.status_inactive}
                          color={u.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {search ? UA.users_not_found_search : UA.users_not_found}
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

export default UsersTable;
