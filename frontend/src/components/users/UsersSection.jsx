import { useState } from 'react';
import { Paper, Box, Typography, Collapse, IconButton, Divider, Snackbar, Alert } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import UsersTable from './UsersTable';
import { useUsers } from '../../hooks/useUsers';
import { useAuthContext } from '../../contexts/AuthContext';
import { translateErrorMessage } from '../../utils/translateError';
import { UA } from '../../utils/uaDictionary';

const UsersSection = ({ initialExpanded = true }) => {
  const { users, search, setSearch, updateUserStatus, loading, setError } = useUsers();
  const { user } = useAuthContext();
  const currentUserId = user?.sub;

  const [expanded, setExpanded] = useState(initialExpanded);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleToggle = () => setExpanded(!expanded);

  const handleUpdateStatus = async (id, isActive) => {
    try {
      await updateUserStatus(id, isActive);
      setSnackbar({
        open: true,
        message: `${UA.users_success_status_updated} ${isActive ? UA.users_activated : UA.users_deactivated}`,
        severity: 'success',
      });
    } catch (err) {
      const userMessage = translateErrorMessage(err.message || UA.users_status_update_error);
      setSnackbar({
        open: true,
        message: userMessage,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <>
      <Paper sx={{ mb: 3, borderRadius: 2 }} elevation={1}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
          }}
          onClick={handleToggle}
        >
          <Typography variant="h5">
            {UA.users_title} ({users.filter((u) => u.role !== 'admin').length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
        <Divider />
        <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 3 }}>
            <UsersTable
              users={users}
              search={search}
              setSearch={setSearch}
              updateUserStatus={handleUpdateStatus}
              currentUserId={currentUserId}
              isLoading={loading}
              isActionLoadingUserId={null}
              setLocalError={setError}
            />
          </Box>
        </Collapse>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UsersSection;
