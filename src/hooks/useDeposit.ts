'use client';

import { useState } from 'react';
import { useAccount, useSendTransaction } from '@starknet-react/core';
import { parseUnits, TransactionExecutionError } from 'viem';
import { useChainContext, useAccountContext, useNotifications, usePoolAccountsContext } from '~/hooks';
import { Hash, ModalType, Secret } from '~/types';
import { createDepositSecrets } from '~/utils';
import { waitForEvents } from '../utils/sdk';
import { useModal } from './useModal';
import { useSdk } from './useSdkWorker';

export const useDeposit = () => {
  const { address } = useAccount();
  const {
    selectedPoolInfo,
    balanceBN: { decimals },
  } = useChainContext();
  const { deposit: sdkDeposit } = useSdk();
  const { addNotification, getDefaultErrorMessage } = useNotifications();
  const { setModalOpen, setIsClosable } = useModal();
  const { sendAsync } = useSendTransaction({});
  const { amount, setTransactionHash } = usePoolAccountsContext();
  const [isLoading, setIsLoading] = useState(false);
  const { accountService, poolAccounts, addPoolAccount } = useAccountContext();

  const deposit = async () => {
    try {
      setIsClosable(false);
      setIsLoading(true);

      if (!accountService) throw new Error('AccountService not found');
      if (!address) throw new Error('Address not found');

      // Count only pool accounts for the current scope
      const poolAccountsForScope = poolAccounts.filter((account) => account.scope === selectedPoolInfo.scope);

      const {
        nullifier,
        secret,
        precommitment: precommitmentHash,
      } = createDepositSecrets(
        accountService,
        BigInt(selectedPoolInfo.scope) as Hash,
        BigInt(poolAccountsForScope.length),
      );
      const value = parseUnits(amount, decimals);

      if (!selectedPoolInfo.scope || !precommitmentHash || !value) throw new Error('Missing required data to deposit');

      // Only set transaction hash and modal if not already done in Safe batch path
      setModalOpen(ModalType.PROCESSING);
      const trData = await sdkDeposit({
        amount: value,
        entryPoint: selectedPoolInfo.entryPointAddress,
        precommitment: precommitmentHash,
        token: selectedPoolInfo.assetAddress,
      });

      const { transaction_hash } = await sendAsync(trData);

      setTransactionHash(transaction_hash as never);

      const deposits = await waitForEvents('Deposit', transaction_hash, selectedPoolInfo as never, 3000);

      if (deposits.length === 0) {
        throw new Error('no deposit found');
      }

      const [{ label, value: _value, blockNumber }] = deposits;

      addPoolAccount(accountService, {
        scope: selectedPoolInfo.scope,
        value: _value,
        nullifier: nullifier as Secret,
        secret: secret as Secret,
        label: label as Hash,
        blockNumber: BigInt(blockNumber!),
        txHash: transaction_hash as `0x${string}`,
      });

      // Show success modal first
      setModalOpen(ModalType.SUCCESS);

      // After a brief delay, check if the deposit might not be visible to users who refresh
      setTimeout(() => {
        addNotification(
          'info',
          `✅ Deposit confirmed! Transaction: ${transaction_hash}\n\nNote: If you refresh the page and your deposit doesn't appear immediately, don't worry! Our indexers may need a few minutes to sync. Your funds are safe on-chain.`,
        );
      }, 2000);
    } catch (err) {
      const error = err as TransactionExecutionError;
      addNotification('error', getDefaultErrorMessage(error?.shortMessage || error?.message));
      setModalOpen(ModalType.NONE);
      setIsLoading(false);
      console.error('Error depositing', error);
    }
    setIsClosable(true);
    setIsLoading(false);
  };

  return { deposit, isLoading };
};
