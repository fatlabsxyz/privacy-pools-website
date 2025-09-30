'use client';

import React, { createContext, FC, ReactNode, useMemo } from 'react';
import {
  Circuits,
  PrivacyPoolStarknetSDK,
  SNContractInteractionsService,
  StarknetAddress,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { RpcProvider } from 'starknet';

interface SnSdkContext {
  createSdk: () => PrivacyPoolStarknetSDK;
  createPoolContract: (params: {
    sdk: PrivacyPoolStarknetSDK;
    entryPoint: StarknetAddress;
    rpcUrl: string;
  }) => SNContractInteractionsService;
}

export const SnSdkContext = createContext({} as SnSdkContext);

export const SnSdkProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const contextValue = useMemo<SnSdkContext>(
    () => ({
      createSdk: () => {
        const currentBaseUrl = globalThis?.location.origin;
        if (!currentBaseUrl) {
          throw new Error('SDK can only be initialized on client-side');
        }
        const circuits = new Circuits({ baseUrl: currentBaseUrl });
        return new PrivacyPoolStarknetSDK(circuits);
      },
      createPoolContract: ({ sdk, entryPoint, rpcUrl }) => {
        return sdk.createSNContractInstance(entryPoint, new RpcProvider({ nodeUrl: rpcUrl }));
      },
    }),
    [],
  );
  return <SnSdkContext.Provider value={contextValue}>{children}</SnSdkContext.Provider>;
};
