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
