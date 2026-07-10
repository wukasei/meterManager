import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTheme } from '@mui/material/styles';

const CustomDatePicker = ({ value, onChange, label, minDate, maxDate, error, helperText, sx }) => {
  const theme = useTheme();
  return (
    <MuiDatePicker
      label={label}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      slotProps={{
        textField: {
          fullWidth: true,
          error,
          helperText,
          sx,
          size: 'small',
        },
        popper: {
          sx: {
            '& .MuiPaper-root': {
              borderRadius: 2,
              boxShadow: 3,
              backgroundColor: theme.palette.background.paper,
            },
            '& .MuiPickersDay-root': {
              fontWeight: 500,
            },
            '& .MuiPickersDay-today': {
              border: `1px solid ${theme.palette.primary.main}`,
            },
            '& .MuiPickersDay-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            },
          },
        },
      }}
    />
  );
};

export default CustomDatePicker;
