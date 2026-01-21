'use client';
import React from 'react';
import { StarknetConfig, ready, braavos, useInjectedConnectors, voyager, jsonRpcProvider } from '@starknet-react/core';
import { whitelistedChains } from '~/config';
import { getEnv } from '~/config/env';

const rpcProvider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: `${getEnv().RPC_URL}${getEnv().ALCHEMY_KEY}`,
    specVersion: getEnv().RPC_SPEC_VERSION,
  }),
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [ready(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: 'always',
  });

  const chains = whitelistedChains;

  return (
    <StarknetConfig chains={chains as never} provider={rpcProvider} connectors={connectors} explorer={voyager}>
      {children}
    </StarknetConfig>
  );
}
