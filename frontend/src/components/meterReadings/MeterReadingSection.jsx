import { useState, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Stack,
  useMediaQuery,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import SearchField from '../ui/SearchField';
import MeterReadingsTable from './MeterReadingsTable';
import MeterReadingForm from './MeterReadingForm';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import CustomDatePicker from '../ui/DatePicker';
import { useTheme } from '@mui/material/styles';
import { UA } from '../../utils/uaDictionary';
import { format } from 'date-fns';

const MeterReadingsSection = ({ initialExpanded = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { meterReadings, removeReading, addReading, editReading, setError } = useMeterReadings();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [formOpen, setFormOpen] = useState(false);
  const [readingToEdit, setReadingToEdit] = useState(null);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [orderBy, setOrderBy] = useState('reading_date');
  const [order, setOrder] = useState('desc');

  const handleToggle = () => setExpanded(!expanded);
  const handleOpenForm = (reading = null) => {
    setReadingToEdit(reading);
    setFormOpen(true);
  };
  const handleDelete = async (id) => {
    try {
      await removeReading(id);
    } catch (err) {
      setError(err.message);
    }
  };
  const handleFormSubmit = async (formData) => {
    if (readingToEdit) {
      await editReading(readingToEdit.id, formData);
    } else {
      await addReading(formData);
    }
    setFormOpen(false);
    setReadingToEdit(null);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setReadingToEdit(null);
  };

  const handleSort = (field) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const sortedFilteredReadings = useMemo(() => {
    if (!meterReadings || !Array.isArray(meterReadings)) return [];
    const query = search.toLowerCase();
    return meterReadings
      .filter((r) => {
        const tenantName = r.MeterTenant?.Tenant?.name || '';
        const meterSerial = r.MeterTenant?.Meter?.serial_number || '';
        const meterLocationName = r.MeterTenant?.Meter?.Location?.name || '';
        const meterLocationAddress = r.MeterTenant?.Meter?.Location?.address || '';

        const matchesSearch =
          tenantName.toLowerCase().includes(query) ||
          meterSerial.toLowerCase().includes(query) ||
          meterLocationName.toLowerCase().includes(query) ||
          meterLocationAddress.toLowerCase().includes(query) ||
          r.reading_date.includes(query);

        let formattedFilter = '';
        if (dateFilter) {
          formattedFilter = format(dateFilter, 'yyyy-MM-dd');
        }
        const matchesDate = !dateFilter || r.reading_date === formattedFilter;
        // console.log('formattedFilter:', dateFilter.toISOString())
        // console.log('reading_date:',r.reading_date)

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => {
        let valA = a[orderBy];
        let valB = b[orderBy];

        if (orderBy === 'reading_date') {
          valA = new Date(valA);
          valB = new Date(valB);
        }

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
  }, [meterReadings, search, dateFilter, orderBy, order]);

  return (
    <>
      <Paper sx={{ borderRadius: 2, mb: 3 }} elevation={1}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={{ xs: 1.5, sm: 2 }}
          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}
          onClick={handleToggle}
        >
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            fontWeight={600}
            sx={{ fontSize: { xs: '1.125rem', sm: '1.5rem' } }}
          >
            {UA.meterReadings_title} ({meterReadings.length})
          </Typography>
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
        <Divider />
        <Collapse in={expanded} timeout="auto">
          <Box p={{ xs: 2, sm: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                mb: 2,
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Button
                variant="contained"
                onClick={() => handleOpenForm()}
                fullWidth={isMobile}
                size={isMobile ? 'medium' : 'large'}
              >
                {UA.common_add}
              </Button>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  ml: { sm: 'auto !important' },
                }}
              >
                <SearchField
                  placeholder={isMobile ? UA.common_search : UA.common_search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                />
                <CustomDatePicker
                  value={dateFilter || null}
                  onChange={(newValue) => setDateFilter(newValue || '')}
                  label={UA.common_search}
                  sx={{
                    width: { xs: '100%', sm: 200 },
                  }}
                />
              </Stack>
            </Stack>
            <MeterReadingsTable
              readings={sortedFilteredReadings}
              onDelete={handleDelete}
              onEdit={handleOpenForm}
              orderBy={orderBy}
              order={order}
              handleSort={handleSort}
            />
          </Box>
        </Collapse>
      </Paper>

      <Dialog
        open={formOpen}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: { xs: '1.125rem', sm: '1.25rem' },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          {readingToEdit ? UA.common_edit : UA.common_add}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <MeterReadingForm
            initialData={readingToEdit}
            onSuccess={(response) => {
              handleFormSubmit(response);
              setFormOpen(false);
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MeterReadingsSection;
