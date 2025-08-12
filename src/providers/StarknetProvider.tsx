'use client';
import React from 'react';
import { sepolia, mainnet } from '@starknet-react/chains';
import { StarknetConfig, publicProvider, ready, braavos, useInjectedConnectors, voyager } from '@starknet-react/core';
import { getEnv } from '~/config/env';
const { TEST_MODE } = getEnv();

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [ready(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: 'always',
  });

  const chains = TEST_MODE ? [sepolia] : [mainnet];

  return (
    <StarknetConfig chains={chains} provider={publicProvider()} connectors={connectors} explorer={voyager}>
      {children}
    </StarknetConfig>
  );
}
