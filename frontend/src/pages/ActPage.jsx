import { Container } from '@mui/material';
import ActsTable from '../components/acts/ActsTable';

export default function ActsPage() {
  return (
    <Container
      maxWidth={false}
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <ActsTable />
    </Container>
  );
}
