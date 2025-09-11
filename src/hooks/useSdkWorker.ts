'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ProveDepositCommand,
  ProveRageQuitCommand,
  ProveWithdrawal,
  WorkerCommands,
  WorkerMessages,
} from '~/types/worker-commands.interface';

const generateId = () => Math.random().toString(36).substring(2, 15);

const waitForMessage = <T extends WorkerMessages, MessageType extends T['type']>(
  worker: Worker,
  messageType: MessageType,
  timeout = 10000,
) =>
  new Promise<T & { type: MessageType }>((resolve, reject) => {
    const removeListener = () => worker.removeEventListener('message', resolveCallback);
    const timeoutTimer = setTimeout(() => {
      removeListener();
      reject(`Worker message not received in ${timeout / 1000} seconds.`);
    }, timeout);
    const resolveCallback = (message: MessageEvent<WorkerMessages>) => {
      if (message.data.type === messageType) {
        removeListener();
        clearTimeout(timeoutTimer);
        resolve(message.data as never);
      }
    };
    worker.addEventListener('message', resolveCallback);
  });

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
