import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import uk from 'date-fns/locale/uk';
import { ukUA } from '@mui/x-date-pickers/locales';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email offline_access',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensFallback={false}
    >
      <LocalizationProvider
        dateAdapter={AdapterDateFns}
        adapterLocale={uk}
        localeText={ukUA.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocalizationProvider>
    </Auth0Provider>
  </StrictMode>
);
