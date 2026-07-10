import { Box, Button, Typography, Paper } from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { UA } from '../utils/uaDictionary';
import { COLORS, DEFAULTS } from '../constants';

const BlockedUserPage = () => {
  const { handleLogout } = useAuthContext();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: '#fdecea',
          borderRadius: DEFAULTS.borderRadius,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          mx: 'auto',
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />

        <Typography variant="h4" gutterBottom color="error" fontWeight="bold">
          {UA.blocked_title}
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, mt: 2, color: 'text.secondary' }}>
          {UA.blocked_message}
        </Typography>

        <Button onClick={handleLogout} variant="contained" color="primary" size="large">
          {UA.blocked_logout}
        </Button>
      </Paper>
    </Box>
  );
};

export default BlockedUserPage;
