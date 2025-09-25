import {
  AccountCommitment,
  PrivacyPoolStarknetSDK,
  WithdrawalProofInput,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { deposit, rageQuit } from '~/utils';

export interface ZKProofWorkerMessage {
  type: 'generateRagequitProof' | 'generateWithdrawalProof' | 'verifyWithdrawalProof';
  payload: unknown;
  id: string;
}

export interface ZKProofWorkerResponse {
  type: 'success' | 'error' | 'progress';
  payload: unknown;
  id: string;
}

export interface ProveWithdrawal {
  type: 'generateWithdrawalProof';
  payload: {
    commitment: AccountCommitment;
    input: WithdrawalProofInput;
  };
}

export interface WithdrawalProved {
  type: 'withdrawalProved';
  payload: Awaited<ReturnType<PrivacyPoolStarknetSDK['proveWithdrawalSN']>>;
}

export interface ProveDepositCommand {
  type: 'generateDepositProve';
  payload: Parameters<typeof deposit>[0];
}

export interface DepositProved {
  type: 'depositProved';
  payload: Awaited<ReturnType<typeof deposit>>;
}

export interface WorkerStarted {
  type: 'ready';
}

export interface ProveRageQuitCommand {
  type: 'generateRagequiteProve';
  payload: Parameters<typeof rageQuit>[0];
}

export interface RageQuitProved {
  type: 'rageQuitProved';
  payload: Awaited<ReturnType<typeof rageQuit>>;
}

export type WorkerMessages = { id: string } & (WithdrawalProved | DepositProved | RageQuitProved);
export type WorkerCommands = {
  id: string;
} & (ProveWithdrawal | ProveDepositCommand | ProveRageQuitCommand);

export type WorkerCommandsTypes = WorkerCommands['type'];
export type WorkerMessagesTypes = WorkerMessages['type'];
