'use client';

import { useState, useCallback } from 'react';
import { addBreadcrumb } from '@sentry/nextjs';
import { useSendTransaction, useAccount } from '@starknet-react/core';
import { TransactionExecutionError } from 'viem';
import { useChainContext, useAccountContext, useModal, useNotifications, usePoolAccountsContext } from '~/hooks';
import { Hash, ModalType, RagequitProof } from '~/types';
import { generateRagequitProof, rageQuit, waitForEvents } from '~/utils';

export const useExit = () => {
  const { address } = useAccount();
  const { addNotification, getDefaultErrorMessage } = useNotifications();
  const { sendAsync } = useSendTransaction({});
  const { setModalOpen, setIsClosable } = useModal();
  const { selectedPoolInfo } = useChainContext();
  const { poolAccount, setTransactionHash, proof, setProof } = usePoolAccountsContext();
  const { seed, accountService, addRagequit } = useAccountContext();
  const [isLoading, setIsLoading] = useState(false);

  const generateProof = useCallback(
    async (
      onProgress?: (progress: {
        phase: 'loading_circuits' | 'generating_proof' | 'verifying_proof';
        progress: number;
      }) => void,
    ) => {
      if (!poolAccount?.lastCommitment) throw new Error('Pool account commitment not found');

      // Use worker for progress updates, but still call actual SDK for proof generation
      const workerPromise = new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/zkProofWorker.ts', import.meta.url));
        const requestId = Math.random().toString(36).substring(2, 15);

        worker.onmessage = (event) => {
          const { type, payload, id } = event.data;

          if (id !== requestId) return;

          switch (type) {
            case 'success':
              worker.terminate();
              resolve(payload);
              break;
            case 'error':
              worker.terminate();
              reject(new Error(payload.message));
              break;
            case 'progress':
              if (onProgress) {
                onProgress(payload);
              }
              break;
          }
        };

        worker.onerror = (error) => {
          worker.terminate();
          reject(error);
        };

        worker.postMessage({
          type: 'generateRagequitProof',
          payload: poolAccount.lastCommitment,
          id: requestId,
        });
      });

      // Run both worker (for progress) and actual SDK call in parallel
      const [, proof] = await Promise.all([workerPromise, generateRagequitProof(poolAccount.lastCommitment)]);

      setProof(proof);

      if (onProgress) {
        onProgress({ phase: 'verifying_proof', progress: 1.0 });
      }

      return proof;
    },
    [poolAccount?.lastCommitment, setProof],
  );

  const exit = useCallback(
    async (proofToUse?: RagequitProof) => {
      const currentProof = proofToUse || proof;
      if (!currentProof) throw new Error('Ragequit proof not found');

      try {
        if (!poolAccount || !accountService || !seed) throw new Error('Missing required data to exit');

        setIsClosable(false);
        setIsLoading(true);

        const { label, secret, nullifier, value, hash: commitmentHash } = poolAccount.lastCommitment;

        const rageQuitCall = await rageQuit({
          entryPoint: selectedPoolInfo.entryPointAddress,
          poolAddress: selectedPoolInfo.address,
          label,
          nullifier,
          secret,
          value,
        });

        const hash = (await sendAsync([rageQuitCall])).transaction_hash as `0x${string}`;

        setTransactionHash(BigInt(hash));
        setModalOpen(ModalType.PROCESSING);

        const receipts = await waitForEvents('Ragequit', hash, selectedPoolInfo as never, 5);

        if (!receipts.length) throw new Error('Receipt not found');

        const [receipt] = receipts;

        addRagequit(accountService, {
          label: receipt.label as Hash,
          ragequit: {
            ragequitter: address!,
            commitment: commitmentHash as Hash,
            label: receipt.label as Hash,
            value: receipt.value,
            blockNumber: BigInt(receipt.blockNumber!),
            transactionHash: hash as `0x${string}`,
          },
        });

        addBreadcrumb({
          message: 'Ragequit successful',
          category: 'transaction',
          data: {
            transactionHash: hash,
            blockNumber: receipt.blockNumber!.toString(),
            value: value.toString(),
          },
          level: 'info',
        });

        setModalOpen(ModalType.SUCCESS);
      } catch (err) {
        const error = err as TransactionExecutionError;
        setModalOpen(ModalType.NONE);

        // Log error to Sentry with full context
        // logErrorToSentry(error, {
        //   operation_step: 'ragequit_execution',
        //   error_type: error?.name || 'unknown',
        //   short_message: error?.shortMessage,
        //   has_proof: !!proof,
        //   has_pool_account: !!poolAccount,
        //   has_account_service: !!accountService,
        //   has_seed: !!seed,
        // });

        const errorMessage = getDefaultErrorMessage(error?.shortMessage || error?.message);
        addNotification('error', errorMessage);
        console.error('Error calling exit', error);
      }
      setIsClosable(true);
      setIsLoading(false);
    },
    [
      proof,
      poolAccount,
      accountService,
      seed,
      setIsClosable,
      setIsLoading,
      address,
      selectedPoolInfo,
      setTransactionHash,
      setModalOpen,
      addRagequit,
      getDefaultErrorMessage,
      addNotification,
      sendAsync,
    ],
  );

  const generateProofAndExit = useCallback(
    async (
      onProgress?: (progress: {
        phase: 'loading_circuits' | 'generating_proof' | 'verifying_proof';
        progress: number;
      }) => void,
    ) => {
      try {
        const proof = await generateProof(onProgress);
        await exit(proof as unknown as RagequitProof);
      } catch (error) {
        console.error('❌ generateProofAndExit failed:', error);
        throw error;
      }
    },
    [generateProof, exit],
  );

  return { exit, generateProof, generateProofAndExit, isLoading };
};
