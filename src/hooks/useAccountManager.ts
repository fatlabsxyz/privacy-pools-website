'use client';

import { useCallback } from 'react';
import { ChainData } from '~/config';
import { PoolAccount } from '~/types';
import { useSdk } from './useWorkerSdk';

export function useAccountManager(
  setSeed: (seed: string) => void,
  setPoolAccounts: (poolAccounts: PoolAccount[]) => void,
  setPoolAccountsByChainScope: (poolAccountsByChainScope: Record<string, PoolAccount[]>) => void,
) {
  const { loadAccounts } = useSdk();

  const loadChainAccounts = useCallback(
    async ({ seed, chain }: { seed: string; chain: ChainData[string]; refetch?: boolean }) => {
      const { poolAccounts, poolAccountsByChainScope } = await loadAccounts({ seed, chain });
      setPoolAccounts(poolAccounts);
      setPoolAccountsByChainScope(poolAccountsByChainScope);

      return { poolAccounts, poolAccountsByChainScope };
    },
    [loadAccounts, setPoolAccounts, setPoolAccountsByChainScope],
  );

  const createAccount = useCallback(
    async (seed: string, chain: ChainData[string]) => {
      await loadChainAccounts({ seed, chain });
      setSeed(seed);
    },
    [loadChainAccounts, setSeed],
  );

  return { loadChainAccounts, createAccount };
}
