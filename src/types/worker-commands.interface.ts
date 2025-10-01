import {
  AccountCommitment,
  PrivacyPoolStarknetSDK,
  StarknetAddress,
  WithdrawalProofInput,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { ChainData as ChainDictionary, CompletePoolInfo } from '~/config';
import {
  addPoolAccount,
  addRagequit,
  addWithdrawal,
  createDepositSecrets,
  createWithdrawalSecrets,
  deposit,
  getPoolAccountsFromAccount,
  rageQuit,
} from '~/utils';

type ChainData = ChainDictionary[string];

export interface AccountRetrievalData {
  seed: string;
  chain: ChainData;
}

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

export interface LoadChainAccountsCommand {
  type: 'loadAccounts';
  payload: AccountRetrievalData & {
    refetch?: boolean;
  };
}

export interface ChainAccountsLoaded {
  type: 'accountsLoaded';
  payload: Awaited<ReturnType<typeof getPoolAccountsFromAccount>>;
}

export interface GetPoolsCompleteInfoCommand {
  type: 'getPoolsInfo';
  payload: {
    chainId: string;
  };
}

export interface PoolsCompleteInfoResponse {
  type: 'gottenPoolsInfo';
  payload: CompletePoolInfo[];
}

export interface CreateDepositSecretsCommand {
  type: 'createDepositSecrets';
  payload: AccountRetrievalData & {
    scope: StarknetAddress;
  };
}

export interface CreateWithdrawSecretsCommand {
  type: 'createWithdrawSecrets';
  payload: AccountRetrievalData & {
    commitment: AccountCommitment;
  };
}

export interface WithdrawalSecretsCreated {
  type: 'withdrawalSecretsCreated';
  payload: ReturnType<typeof createWithdrawalSecrets>;
}

export interface DepositSecretsCreated {
  type: 'depositSecretsCreated';
  payload: ReturnType<typeof createDepositSecrets>;
}

export interface AddPoolAccountCommand {
  type: 'addPool';
  payload: Parameters<typeof addPoolAccount>[1] & AccountRetrievalData;
}

export interface AddWithdrawalCommand {
  type: 'addWithdrawal';
  payload: Parameters<typeof addWithdrawal>[1] & AccountRetrievalData;
}

export interface AddRagequitCommand {
  type: 'addRagequit';
  payload: Parameters<typeof addRagequit>[1] & AccountRetrievalData;
}

type AccountModificationCommands = AddPoolAccountCommand | AddWithdrawalCommand | AddRagequitCommand;

export interface AddPoolAccountResponse {
  type: 'addPool';
  payload: ReturnType<typeof addPoolAccount>;
}

export interface AddWithdrawalResponse {
  type: 'addWithdrawal';
  payload: Awaited<ReturnType<typeof addWithdrawal>>;
}

export interface AddRagequitResponse {
  type: 'addRagequit';
  payload: Awaited<ReturnType<typeof addRagequit>>;
}

type AccountModificationRespones = AddPoolAccountResponse | AddWithdrawalResponse | AddRagequitResponse;

export type WorkerMessages = { id: string } & (
  | WithdrawalProved
  | DepositProved
  | RageQuitProved
  | ChainAccountsLoaded
  | PoolsCompleteInfoResponse
  | DepositSecretsCreated
  | AccountModificationRespones
  | WithdrawalSecretsCreated
);

export type WorkerCommands = {
  id: string;
} & (
  | ProveWithdrawal
  | ProveDepositCommand
  | ProveRageQuitCommand
  | LoadChainAccountsCommand
  | GetPoolsCompleteInfoCommand
  | CreateDepositSecretsCommand
  | AccountModificationCommands
  | CreateWithdrawSecretsCommand
);

export type WorkerCommandsTypes = WorkerCommands['type'];
export type WorkerMessagesTypes = WorkerMessages['type'];
