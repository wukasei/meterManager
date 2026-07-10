import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Container, CircularProgress } from '@mui/material'; // Додано Container та CircularProgress, видалено DialogContent
import { useAuthContext } from '../contexts/AuthContext';
import MeterReadingSection from '../components/meterReadings/MeterReadingSection';

const SubmitMetricsPage = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          bgcolor: 'background.default',
          px: 2,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 5,
            textAlign: 'center',
            maxWidth: 400,
            borderRadius: 3,
            mx: 'auto',
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Доступ обмежено
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Щоб подавати показники, увійдіть у свій акаунт
          </Typography>
          <Button onClick={loginWithRedirect} variant="contained" color="primary" size="large" sx={{ mt: 3 }}>
            Увійти / Зареєструватися
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Подача показників
        </Typography>
        <Box sx={{ mt: 3 }}>
          <MeterReadingSection initialExpanded={true} />
        </Box>
      </Paper>
    </Container>
  );
};

export default SubmitMetricsPage;
