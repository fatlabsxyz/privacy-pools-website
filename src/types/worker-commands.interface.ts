import {
  AccountCommitment,
  PrivacyPoolStarknetSDK,
  WithdrawalProofInput,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';

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

export interface WorkerStarted {
  type: 'ready';
}

export type WorkerMessages = { id: string } & WithdrawalProved;
export type WorkerCommands = {
  id: string;
} & ProveWithdrawal;
