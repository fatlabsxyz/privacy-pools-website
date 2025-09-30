'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  Circuits,
  PrivacyPoolStarknetSDK,
  SNContractInteractionsService,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { RpcProvider } from 'starknet';
import {
  ProveDepositCommand,
  ProveRageQuitCommand,
  ProveWithdrawal,
  WorkerCommands,
  WorkerMessages,
} from '~/types/worker-commands.interface';
import { getScope as sdkGetScope } from '~/utils';
import { waitForMessage } from '~/utils/worker';
import { useChainContext } from './context/useChainContext';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useSdk = () => {
  const {
    chain: { rpcUrl },
    selectedPoolInfo: { entryPointAddress },
  } = useChainContext();

  const sdkRef = useRef<PrivacyPoolStarknetSDK>(null);
  useEffect(() => {
    const circuits = new Circuits({ baseUrl: globalThis?.location.origin });
    sdkRef.current = new PrivacyPoolStarknetSDK(circuits);
  }, []);

  const poolContractRef = useRef<SNContractInteractionsService>(null as never);
  const workerRef = useRef<Worker>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/zkProofWorker.ts', import.meta.url));
  }, []);

  useEffect(() => {
    if (sdkRef.current) {
      poolContractRef.current = sdkRef.current.createSNContractInstance(
        entryPointAddress,
        new RpcProvider({ nodeUrl: rpcUrl }),
      );
    }
  }, [rpcUrl, sdkRef, entryPointAddress]);

  const waitForSdkMessage = useCallback(
    <T extends WorkerMessages, MessageType extends T['type']>(message: MessageType) => {
      if (workerRef.current) {
        return waitForMessage<T, typeof message>(workerRef.current, message);
      }
    },
    [workerRef],
  );

  const sendWorkerCommand = useCallback(
    (command: Omit<WorkerCommands, 'id'>) =>
      workerRef.current?.postMessage({
        ...command,
        id: generateId(),
      }),
    [workerRef],
  );

  const withdraw = useCallback(
    async (payload: ProveWithdrawal['payload']) => {
      const proof = waitForSdkMessage('withdrawalProved');
      sendWorkerCommand({
        type: 'generateWithdrawalProof',
        payload,
      });
      return (await proof)?.payload;
    },
    [waitForSdkMessage, sendWorkerCommand],
  );

  const deposit = useCallback(
    async (payload: ProveDepositCommand['payload']) => {
      const proof = waitForSdkMessage('depositProved');
      sendWorkerCommand({
        type: 'generateDepositProve',
        payload,
      });
      return (await proof)?.payload;
    },
    [waitForSdkMessage, sendWorkerCommand],
  );

  const rageQuit = useCallback(
    async (payload: ProveRageQuitCommand['payload']) => {
      const proof = waitForSdkMessage('rageQuitProved');
      sendWorkerCommand({
        type: 'generateRagequiteProve',
        payload,
      });
      return (await proof)?.payload;
    },
    [waitForSdkMessage, sendWorkerCommand],
  );

  const getScope = sdkGetScope;

  return {
    withdraw,
    deposit,
    rageQuit,
    getScope,
  };
};
