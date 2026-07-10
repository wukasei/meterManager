import { Container, Typography, Box, CircularProgress, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import LocationsSection from '../components/locations/LocationsSection';
import TenantsSection from '../components/tenants/TenantsSection';
import ResourceDeliverySection from '../components/resource-deliveries/ResourceDeliverySection';
import ResourceTypesSection from '../components/resourceTypes/ResourceTypesSection';
import TariffsSection from '../components/tariffs/TariffsSection';
import MetersSection from '../components/meters/MetersSection';
import MeterTenantsSection from '../components/meter-tenants/MeterTenantsSection';
import UsersSection from '../components/users/UsersSection';
import { useAuthContext } from '../contexts/AuthContext';
import { UA } from '../utils/uaDictionary';

const ALL_SECTIONS = [
  { path: 'locations', Component: LocationsSection },
  { path: 'resource-types', Component: ResourceTypesSection },
  { path: 'tenants', Component: TenantsSection },
  { path: 'resource-delivery', Component: ResourceDeliverySection },
  { path: 'tariffs', Component: TariffsSection },
  { path: 'meters', Component: MetersSection },
  { path: 'meter-tenants', Component: MeterTenantsSection },
  { path: 'users', Component: UsersSection },
];

const DashboardPage = () => {
  const { section } = useParams();
  const { isAdmin, loading: authLoading } = useAuthContext();

  const renderSection = () => {
    if (section) {
      const Section = ALL_SECTIONS.find((s) => s.path === section);
      if (Section) {
        return <Section.Component initialExpanded={true} />;
      }
    }

    return (
      <Stack spacing={3} direction={{ xs: 'column', md: 'row' }} flexWrap="wrap">
        {ALL_SECTIONS.map(({ path, Component }) => (
          <Box key={path} flex={1} minWidth={{ xs: '100%', md: '300px' }}>
            <Component initialExpanded={false} />
          </Box>
        ))}
      </Stack>
    );
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h5" align="center" sx={{ my: 4 }}>
          {UA.dashboard_no_access}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography
        variant="h3"
        align="center"
        sx={{
          my: 4,
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
        }}
      >
        {UA.dashboard_title}
      </Typography>
      {renderSection()}
    </Container>
  );
};

export default DashboardPage;
