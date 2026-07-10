import { useState, useCallback } from 'react';

export const useErrorHandler = (defaultMessage) => {
  const [error, setError] = useState(null);

  // useCallback ensures this function reference only changes
  // if 'defaultMessage' changes.
  const handleError = useCallback(
    (err, customMessage) => {
      if (err.response?.status === 403) return;

      // We use a functional update for setError if needed,
      // but here standard is fine since we aren't derived from prev state
      setError(customMessage || err.message || defaultMessage);
    },
    [defaultMessage]
  );

  return { error, setError, handleError };
};
