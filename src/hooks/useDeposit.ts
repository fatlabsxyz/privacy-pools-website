'use client';

import { useState } from 'react';
import { useAccount, useSwitchChain, useContract, useTransactionReceipt } from '@starknet-react/core';
import { parseUnits, TransactionExecutionError } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getConfig } from '~/config';
import { useChainContext, useAccountContext, useNotifications, usePoolAccountsContext } from '~/hooks';
import { Hash, ModalType, Secret } from '~/types';
import { depositEventAbi, decodeEventsFromReceipt, createDepositSecrets } from '~/utils';
import { useModal } from './useModal';
import { useSafeTransactions } from './useSafeTransactions';
import type { FunctionAbi } from 'starknet';

const {
  env: { TEST_MODE },
  constants: { DEFAULT_ASSET },
} = getConfig();

const depositAbi = [
  {
    type: 'function',
    name: 'deposit',
    state_mutability: 'external',
    inputs: [
      {
        name: 'depositor',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'value',
        type: 'core::integer::u256',
      },
      {
        name: 'preCommitmentHash',
        type: 'core::integer::u256',
      },
    ],
    outputs: [
      {
        name: 'asd',
        type: 'core::integer::u256',
      },
    ],
  },
] as const satisfies [FunctionAbi];

const readDepositor = [
  {
    type: 'function',
    name: 'depositor',
    state_mutability: 'external',
    inputs: [
      {
        name: 'label',
        type: 'core::integer::u256',
      },
    ],
    outputs: [],
  },
] as const satisfies [FunctionAbi];

export const useDeposit = () => {
  const { address } = useAccount();
  const {
    chainId,
    selectedPoolInfo,
    balanceBN: { decimals },
  } = useChainContext();
  const { contract } = useContract({
    abi: depositAbi,
    address: selectedPoolInfo.address,
  });
  const { addNotification, getDefaultErrorMessage } = useNotifications();
  const { switchChainAsync } = useSwitchChain({});
  const { setModalOpen, setIsClosable } = useModal();
  const { amount, setTransactionHash, transactionHash } = usePoolAccountsContext();
  const { refetch: waitForRecepit } = useTransactionReceipt({ enabled: false, hash: transactionHash });
  const [isLoading, setIsLoading] = useState(false);
  const { accountService, poolAccounts, addPoolAccount } = useAccountContext();
  const { data: walletClient } = useWalletClient({ chainId: +chainId });
  const publicClient = usePublicClient({ chainId: +chainId });
  const { isSafeApp } = useSafeTransactions();

  const deposit = async () => {
    try {
      setIsClosable(false);
      setIsLoading(true);

      // Only switch chain if not already on the correct chain and not using Safe
      if (!isSafeApp && walletClient?.chain?.id !== +chainId) {
        await switchChainAsync({ chainId });
      }

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

      if (!TEST_MODE) {
        if (!walletClient || !publicClient) throw new Error('Wallet or Public client not found');

        if (!selectedPoolInfo.scope || !precommitmentHash || !value)
          throw new Error('Missing required data to deposit');

        const hash = await contract!.call('deposit', [address, value, precommitmentHash]);

        // For Safe, we need to handle the transaction hash differently
        // Only check for ETH deposits (non-batched) through Safe
        // if (isSafeApp && selectedPoolInfo.asset === DEFAULT_ASSET && hash.startsWith('0x') && hash.length === 66) {
        //   // For ETH deposits through Safe, check if this is a Safe transaction hash

        //   // Try to wait for the actual transaction
        //   const actualTxHash = await waitForSafeTransaction(hash);
        //   if (actualTxHash) {
        //     hash = actualTxHash as ViemHash;
        //   }
        // }

        // Only set transaction hash and modal if not already done in Safe batch path
        setTransactionHash(hash);
        setModalOpen(ModalType.PROCESSING);

        const receipt = await waitForRecepit();

        if (!receipt) throw new Error('Receipt not found');

        const events = decodeEventsFromReceipt(receipt, depositEventAbi);
        const depositedEvents = events.filter((event) => event.eventName === 'Deposited');
        if (!depositedEvents.length) throw new Error('Deposited event not found');
        const { _commitment, _label, _value } = depositedEvents[0].args as {
          _commitment: bigint;
          _label: bigint;
          _value: bigint;
        };

        if (!_commitment || !_label) throw new Error('Commitment or label not found');

        addPoolAccount(accountService, {
          scope: selectedPoolInfo.scope,
          value: _value,
          nullifier: nullifier as Secret,
          secret: secret as Secret,
          label: _label as Hash,
          blockNumber: receipt.blockNumber,
          txHash: hash,
        });

        // Show success modal first
        setModalOpen(ModalType.SUCCESS);

        // After a brief delay, check if the deposit might not be visible to users who refresh
        setTimeout(() => {
          addNotification(
            'info',
            `✅ Deposit confirmed! Transaction: ${hash}\n\nNote: If you refresh the page and your deposit doesn't appear immediately, don't worry! Our indexers may need a few minutes to sync. Your funds are safe on-chain.`,
          );
        }, 2000);
      } else {
        // Mock flow
        setModalOpen(ModalType.PROCESSING);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setModalOpen(ModalType.SUCCESS);
      }
    } catch (err) {
      const error = err as TransactionExecutionError;
      addNotification('error', getDefaultErrorMessage(error?.shortMessage || error?.message));
      console.error('Error depositing', error);
    }
    setIsClosable(true);
    setIsLoading(false);
  };

  return { deposit, isLoading };
};
