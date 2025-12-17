'use client';
import React, { useRef } from 'react';
import { StarknetConfig, ready, braavos, useInjectedConnectors, voyager, jsonRpcProvider } from '@starknet-react/core';
import { whitelistedChains } from '~/config';
import { getEnv } from '~/config/env';

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [ready(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: 'always',
  });

  const chains = whitelistedChains;

  const alchemyProvider = useRef(
    jsonRpcProvider({
      rpc: () => ({
        nodeUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/${getEnv().ALCHEMY_KEY}`,
        specVersion: '0.10.0',
      }),
    }),
  );

  return (
    <StarknetConfig
      chains={chains as never}
      provider={alchemyProvider.current}
      connectors={connectors}
      explorer={voyager}
    >
      {children}
    </StarknetConfig>
  );
}
