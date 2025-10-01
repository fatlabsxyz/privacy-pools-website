'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  AccountRetrievalData,
  AddPoolAccountCommand,
  AddRagequitCommand,
  AddWithdrawalCommand,
  CreateDepositSecretsCommand,
  CreateWithdrawSecretsCommand,
  GetPoolsCompleteInfoCommand,
  LoadChainAccountsCommand,
  ProveDepositCommand,
  ProveRageQuitCommand,
  ProveWithdrawal,
  WorkerCommands,
  WorkerMessages,
} from '~/types/worker-commands.interface';
import { waitForMessage } from '~/utils/worker';

const generateId = () => Math.random().toString(36).substring(2, 15);

// TODO: Move to context
let worker: Worker | null = null;
const initWorker = () => worker || (worker = new Worker(new URL('../workers/zkProofWorker.ts', import.meta.url)));

export const useSdk = () => {
  const workerRef = useRef<Worker>(null);

  useEffect(() => {
    workerRef.current = initWorker();
  }, []);

  const waitForSdkMessage = useCallback(
    <T extends WorkerMessages, MessageType extends T['type']>(message: MessageType) => {
      if (!workerRef.current) {
        throw new Error('Worker not ready.');
      }
      return waitForMessage<T, typeof message>(workerRef.current, message);
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

  const loadAccounts = useCallback(
    async (payload: LoadChainAccountsCommand['payload']) => {
      const accounts = waitForSdkMessage('accountsLoaded');
      sendWorkerCommand({
        type: 'loadAccounts',
        payload,
      });
      return (await accounts).payload;
    },
    [waitForSdkMessage, sendWorkerCommand],
  );

  const getPoolsInfo = useCallback(
    async (payload: GetPoolsCompleteInfoCommand['payload']) => {
      const poolsInfo = waitForSdkMessage('gottenPoolsInfo');
      sendWorkerCommand({
        type: 'getPoolsInfo',
        payload,
      });
      return (await poolsInfo).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  const createDepositSecrets = useCallback(
    async (payload: CreateDepositSecretsCommand['payload']) => {
      const secrets = waitForSdkMessage('depositSecretsCreated');
      sendWorkerCommand({
        type: 'createDepositSecrets',
        payload,
      });
      return (await secrets).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  const addPoolAccount = useCallback(
    async (payload: AddPoolAccountCommand['payload'] & AccountRetrievalData) => {
      const result = waitForSdkMessage('addPool');
      sendWorkerCommand({
        type: 'addPool',
        payload,
      });
      return (await result).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  const addRagequit = useCallback(
    async (payload: AddRagequitCommand['payload'] & AccountRetrievalData) => {
      const result = waitForSdkMessage('addRagequit');
      sendWorkerCommand({
        type: 'addRagequit',
        payload,
      });
      return (await result).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  const addWithdrawal = useCallback(
    async (payload: AddWithdrawalCommand['payload'] & AccountRetrievalData) => {
      const result = waitForSdkMessage('addWithdrawal');
      sendWorkerCommand({
        type: 'addWithdrawal',
        payload,
      });
      return (await result).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  const createWithdrawalSecrets = useCallback(
    async (payload: CreateWithdrawSecretsCommand['payload']) => {
      const secrets = waitForSdkMessage('withdrawalSecretsCreated');
      sendWorkerCommand({
        type: 'createWithdrawSecrets',
        payload,
      });
      return (await secrets).payload;
    },
    [sendWorkerCommand, waitForSdkMessage],
  );

  return {
    withdraw,
    deposit,
    rageQuit,
    loadAccounts,
    getPoolsInfo,
    createDepositSecrets,
    addPoolAccount,
    addRagequit,
    addWithdrawal,
    createWithdrawalSecrets,
  };
};
