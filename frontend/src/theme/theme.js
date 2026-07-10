import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003153',
      light: '#004266',
      dark: '#002040',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.125rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  mixins: {
    dialogTitle: {
      fontSize: { xs: '1.125rem', sm: '1.25rem' },
      fontWeight: 600,
      px: { xs: 2, sm: 3 },
      py: { xs: 2, sm: 2.5 },
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dialogContent: {
      px: { xs: 2, sm: 3 },
      pb: 1,
    },
    dialogActions: {
      px: { xs: 2, sm: 3 },
      py: { xs: 2, sm: 2 },
      gap: 1,
      flexDirection: { xs: 'column-reverse', sm: 'row' },
      '& .MuiButton-root': {
        minWidth: { xs: 'auto', sm: '80px' },
        fontSize: { xs: '1rem', sm: '0.875rem' },
        height: { xs: '44px', sm: '36px' },
      },
    },
    formPaper: {
      p: { xs: 2, sm: 3 },
      maxWidth: { xs: '100%', sm: '90%', md: 800 },
      mx: 'auto',
    },
    formTitle: {
      fontSize: { xs: '1.125rem', sm: '1.25rem' },
      fontWeight: 600,
      mb: { xs: 2, sm: 3 },
    },
    tableHeadCell: {
      fontWeight: 600,
      backgroundColor: 'grey.50',
    },
    tableRow: {
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
    card: {
      mb: 2,
      boxShadow: 2,
      border: '1px solid',
      borderColor: 'divider',
      '&:hover': {
        boxShadow: 4,
      },
    },
    cardContent: {
      pb: 1,
      '&:last-child': {
        pb: 2,
      },
    },
    sectionPaper: {
      mb: 3,
      borderRadius: 2,
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 2,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
    },
    errorAlert: {
      mb: 2,
      bgcolor: '#ffebee',
      p: 2,
      borderRadius: 1,
    },
    infoBox: {
      bgcolor: '#f0f7ff',
      p: 2,
      borderRadius: 1,
      border: '1px solid #2196f3',
    },
    buttonPrimary: {
      width: { xs: '100%', sm: 'auto' },
      minWidth: '160px',
      height: '40px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    },
    searchField: {
      width: { xs: '100%', sm: '300px' },
    },
    filterRow: {
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      flexWrap: 'wrap',
      gap: 2,
      alignItems: 'center',
    },
    filterBox: {
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      mb: 2,
    },
    emptyState: {
      p: 3,
      textAlign: 'center',
    },
    loadingState: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
    },
    mobileCardTitle: {
      fontWeight: 600,
    },
    chipStatus: {
      ml: 1,
      flexShrink: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowX: 'hidden',
        },
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#003153 #f5f5f5',
          overflowX: 'hidden',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: '#f5f5f5',
        },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: '#003153',
          borderRadius: '4px',
        },
        '::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#004266',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#003153',
          color: '#ffffff',
          transition: 'width 0.3s',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'inherit',
          minWidth: 40,
          justifyContent: 'center',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width: 600px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          width: '100%',
          tableLayout: 'auto',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: 'grey.50',
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          PaperProps: {
            sx: {
              maxWidth: {
                xs: '90vw',
                sm: '500px',
              },
              width: 'auto',
              maxHeight: '300px',
              '& .MuiMenuItem-root': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '1rem',
                padding: '8px 16px',
              },
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          padding: '8px 16px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          '&:hover': {
            backgroundColor: 'rgba(0, 49, 83, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 49, 83, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(0, 49, 83, 0.12)',
            },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          maxWidth: {
            xs: '90vw',
            sm: '500px',
          },
          width: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        list: {
          padding: '4px 0',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: { xs: '100%', sm: '90%', md: '500px' },
          maxWidth: { xs: '100%', sm: '500px' },
          margin: { xs: 0, sm: 'auto' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: { xs: '0.875rem', sm: '1rem' },
        },
      },
    },
  },
  shape: {
    borderRadius: 4,
  },
  custom: {
    drawerWidth: 240,
    collapsedDrawerWidth: 60,
    iconButtonPadding: 1,
    subMenuPadding: 4,
    searchBoxStyles: {
      flexGrow: 1,
      minWidth: 200,
      maxWidth: '100%',
    },
    headerBoxStyles: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 2,
      flexWrap: 'wrap',
      gap: 1,
      width: '100%',
      maxWidth: '100%',
    },
    selectMenuProps: {
      PaperProps: {
        sx: {
          maxWidth: {
            xs: '90vw',
            sm: '500px',
          },
          width: 'auto',
          maxHeight: '300px',
        },
      },
    },
  },
});

export default theme;
