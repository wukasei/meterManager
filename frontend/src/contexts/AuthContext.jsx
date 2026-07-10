import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { verifyUser as verifyUserApi } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
    user: auth0User,
    loginWithRedirect,
    logout,
  } = useAuth0();

  const [userData, setUserData] = useState(null);
  const [token, setToken] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const isMountedRef = useRef(true);
  const verificationPromiseRef = useRef(null);

  const updateState = useCallback((newState) => {
    if (newState.userData !== undefined) setUserData(newState.userData);
    if (newState.token !== undefined) setToken(newState.token);
    if (newState.isBlocked !== undefined) setIsBlocked(newState.isBlocked);
    if (newState.error !== undefined) setError(newState.error);
    if (newState.hasVerified !== undefined) setHasVerified(newState.hasVerified);
    if (newState.loading !== undefined) setLoading(newState.loading);
  }, []);

  const handleAuthError = useCallback(
    (err) => {
      const errorMessage = err.message || err.error || '';
      const errorDescription = err.error_description || '';

      // Check for refresh token errors
      const isRefreshTokenError =
        errorMessage.includes('refresh token') ||
        errorMessage.includes('invalid_grant') ||
        errorDescription.includes('refresh token') ||
        err.error === 'invalid_grant' ||
        err.error === 'login_required';

      if (isRefreshTokenError) {
        console.log('🔄 Refresh token invalid, redirecting to login...');

        // Clear all auth state
        localStorage.removeItem('token');
        setUserData(null);
        setToken(null);
        setHasVerified(false);
        setIsBlocked(false);
        setError(null);
        setLoading(false);

        // Redirect to login
        loginWithRedirect({
          appState: { returnTo: window.location.pathname },
        });

        return true;
      }

      return false;
    },
    [loginWithRedirect]
  );

  const verify = useCallback(async () => {
    if (!isAuthenticated || auth0Loading) {
      setLoading(false);
      return null;
    }

    if (isBlocked) {
      return null;
    }

    if (hasVerified && token) {
      return token;
    }

    if (verificationPromiseRef.current) {
      try {
        const result = await verificationPromiseRef.current;
        return result;
      } catch {
        return null;
      }
    }

    verificationPromiseRef.current = (async () => {
      try {
        setLoading(true);

        const newToken = await getAccessTokenSilently({
          authorizationParams: { audience },
          cacheMode: 'on',
        });

        const response = await verifyUserApi(newToken);

        const newState = {
          token: newToken,
          userData: response.user,
          error: null,
          isBlocked: false,
          hasVerified: true,
          loading: false,
        };
        updateState(newState);

        if (response.user && response.user.role) {
          setIsAdmin(response.user.role === 'admin');
        }

        return newToken;
      } catch (err) {
        console.log('❌ Verification failed:', err);
        console.log('📊 Error details:', {
          status: err.response?.status,
          message: err.response?.data?.message,
          error: err.error,
          errorDescription: err.error_description,
        });

        // Check if it's a refresh token error
        if (handleAuthError(err)) {
          return null;
        }

        // Handle blocked user (403)
        if (err.response?.status === 403) {
          const newState = {
            isBlocked: true,
            error: err.response?.data?.message || 'Ваш акаунт деактивовано.',
            userData: null,
            token: null,
            hasVerified: true,
            loading: false,
          };
          localStorage.removeItem('token');
          updateState(newState);
          return null;
        }

        // Handle other errors
        const newState = {
          error: err.message || 'Authentication failed',
          userData: null,
          hasVerified: true,
          loading: false,
        };
        updateState(newState);
        return null;
      } finally {
        verificationPromiseRef.current = null;
      }
    })();

    try {
      return await verificationPromiseRef.current;
    } catch {
      return null;
    }
  }, [
    isAuthenticated,
    auth0Loading,
    getAccessTokenSilently,
    audience,
    updateState,
    isBlocked,
    hasVerified,
    token,
    handleAuthError,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isBlocked) {
      verify();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [verify, isBlocked]);

  useEffect(() => {
    if (userData && userData.role) {
      setIsAdmin(userData.role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }, [userData]);

  const handleLogout = useCallback(() => {
    setUserData(null);
    setToken(null);
    setIsBlocked(false);
    setError(null);
    setHasVerified(false);
    setLoading(true);
    setIsAdmin(false);
    localStorage.removeItem('token');
    logout({ logoutParams: { returnTo: window.location.origin } });
  }, [logout]);

  const getToken = useCallback(async () => {
    if (isBlocked) throw new Error('User is blocked');
    if (token) return token;
    return await verify();
  }, [verify, isBlocked, token]);

  const value = {
    isAuthenticated,
    user: userData || auth0User,
    isLoading: loading || auth0Loading,
    error,
    isBlocked,
    loginWithRedirect,
    handleLogout,
    getToken,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
