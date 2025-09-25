'use client';

import { RefObject, useCallback } from 'react';
import { AccountService, PoolAccount } from '~/types';
import { createAccount as sdkCreateAccount, getPoolAccountsFromAccount, loadAccount as sdkLoadAccount } from '~/utils';

export function useAccountManager(
  setSeed: (seed: string) => void,
  setPoolAccounts: (poolAccounts: PoolAccount[]) => void,
  setPoolAccountsByChainScope: (poolAccountsByChainScope: Record<string, PoolAccount[]>) => void,
  accountServiceRef: RefObject<AccountService | null>,
  chainId: string,
) {
  const createAccount = useCallback(
    (_seed: string) => {
      if (!_seed) throw new Error('Seed not found');

      const _accountService = sdkCreateAccount(_seed);
      setSeed(_seed);
      accountServiceRef.current = _accountService;
    },
    [setSeed, accountServiceRef],
  );

  const loadAccount = async (seed: string) => {
    const _accountService = await sdkLoadAccount(seed);
    accountServiceRef.current = _accountService;

    const { poolAccounts, poolAccountsByChainScope } = await getPoolAccountsFromAccount(
      _accountService.account,
      chainId,
    );
    setPoolAccounts(poolAccounts);
    setPoolAccountsByChainScope(poolAccountsByChainScope);

    return poolAccounts;
  };

  return { loadAccount, createAccount };
}
