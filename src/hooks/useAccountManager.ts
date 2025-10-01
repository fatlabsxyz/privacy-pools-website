'use client';

import { useCallback } from 'react';
import { ChainData } from '~/config';
import { PoolAccount } from '~/types';
// import { createAccount as sdkCreateAccount } from '~/utils';
import { useSdk } from './useWorkerSdk';

export function useAccountManager(
  // setSeed: (seed: string) => void,
  setPoolAccounts: (poolAccounts: PoolAccount[]) => void,
  setPoolAccountsByChainScope: (poolAccountsByChainScope: Record<string, PoolAccount[]>) => void,
  // accountServiceRef: RefObject<AccountService | null>,
) {
  const { loadAccounts } = useSdk();
  // const createAccount = useCallback(
  //   (_seed: string) => {
  //     if (!_seed) throw new Error('Seed not found');

  //     const _accountService = sdkCreateAccount(_seed);
  //     setSeed(_seed);
  //     accountServiceRef.current = _accountService;
  //   },
  //   [setSeed, accountServiceRef],
  // );

  const loadChainAccounts = useCallback(
    async ({ seed, chain, refetch = true }: { seed: string; chain: ChainData[string]; refetch?: boolean }) => {
      const { poolAccounts, poolAccountsByChainScope } = await loadAccounts({ seed, chain, refetch });
      setPoolAccounts(poolAccounts);
      setPoolAccountsByChainScope(poolAccountsByChainScope);

      return { poolAccounts, poolAccountsByChainScope };
    },
    [loadAccounts, setPoolAccounts, setPoolAccountsByChainScope],
  );

  const createAccount = useCallback(
    async (seed: string, chain: ChainData[string]) => loadChainAccounts({ seed, chain, refetch: false }),
    [loadChainAccounts],
  );

  return { loadChainAccounts, createAccount };
}
