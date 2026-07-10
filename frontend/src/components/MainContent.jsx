import { Box, Typography } from '@mui/material';
import DashboardPage from '../pages/DashboardPage';
import SubmitMetricsPage from '../pages/SubmitMetricsPage';
import ActsPage from '../pages/ActPage';

const MainContent = ({ selectedMenuItem }) => {
  const getContentByMenuItem = (key) => {
    switch (key) {
      case '1':
        return <SubmitMetricsPage />;
      case '2':
        return <DashboardPage />;
      case '3':
        return <ActsPage />;
      // case '4':
      //   return (
      //     <Box>
      //       <Typography variant="h4" gutterBottom>
      //         Налаштування
      //       </Typography>
      //       <Typography variant="body1">Тут будуть налаштування системи.</Typography>
      //     </Box>
      //   );
      default:
        return <DashboardPage />;
    }
  };

  return <Box sx={{ flexGrow: 1, p: 3 }}>{getContentByMenuItem(selectedMenuItem)}</Box>;
};

export default MainContent;
