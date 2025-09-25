'use client';
import React from 'react';
import { StarknetConfig, publicProvider, ready, braavos, useInjectedConnectors, voyager } from '@starknet-react/core';
import { whitelistedChains } from '~/config';

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [ready(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: 'always',
  });

  const chains = whitelistedChains;

  return (
    <StarknetConfig chains={chains as never} provider={publicProvider()} connectors={connectors} explorer={voyager}>
      {children}
    </StarknetConfig>
  );
}
