'use client';

import { useState, useEffect } from 'react';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';

export interface SafeAppInfo {
  isSafeApp: boolean;
  isLoading: boolean;
  safe: {
    safeAddress: string;
    chainId: number;
    network: string;
  } | null;
  sdk: unknown; // Safe Apps SDK instance
}

export const useSafeApp = (): SafeAppInfo => {
  const { sdk, connected, safe } = useSafeAppsSDK();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once we've determined the connection status
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Give it a second to initialize

    return () => clearTimeout(timer);
  }, [connected]);

  return {
    isSafeApp: connected,
    isLoading,
    safe:
      connected && safe
        ? {
            safeAddress: safe.safeAddress,
            chainId: safe.chainId,
            network: safe.network || 'unknown',
          }
        : null,
    sdk,
  };
};
