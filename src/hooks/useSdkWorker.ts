'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ProveDepositCommand,
  ProveRageQuitCommand,
  ProveWithdrawal,
  WorkerCommands,
  WorkerMessages,
} from '~/types/worker-commands.interface';
import { waitForMessage } from '~/utils/worker';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useSdk = () => {
  const workerRef = useRef<Worker>(null as never);
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/zkProofWorker.ts', import.meta.url));
  }, []);

  const waitForSdkMessage = useCallback(
    <T extends WorkerMessages, MessageType extends T['type']>(message: MessageType) =>
      waitForMessage<T, typeof message>(workerRef.current, message),
    [workerRef],
  );
  const sendWorkerCommand = useCallback(
    (command: Omit<WorkerCommands, 'id'>) =>
      workerRef.current.postMessage({
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
      return (await proof).payload;
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
      return (await proof).payload;
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
      return (await proof).payload;
    },
    [waitForSdkMessage, sendWorkerCommand],
  );

  return {
    withdraw,
    deposit,
    rageQuit,
  };
};
