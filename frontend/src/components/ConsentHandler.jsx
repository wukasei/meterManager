import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Alert } from '@mui/material';
import { UA } from '../utils/uaDictionary';

const ConsentHandler = () => {
  const { loginWithRedirect } = useAuth0();
  const [isGettingConsent, setIsGettingConsent] = useState(false);

  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const scope = 'openid profile email';

  const handleGetConsent = async () => {
    setIsGettingConsent(true);
    try {
      await loginWithRedirect({
        authorizationParams: {
          audience,
          scope,
          prompt: 'consent',
        },
      });
    } catch {
      setIsGettingConsent(false);
    }
  };

  return (
    <Alert
      severity="info"
      action={
        <Button color="inherit" size="small" onClick={handleGetConsent} disabled={isGettingConsent}>
          {isGettingConsent ? UA.consent_button_redirecting : UA.consent_button_continue}
        </Button>
      }
    >
      {UA.consent_info_message}
    </Alert>
  );
};

export default ConsentHandler;
