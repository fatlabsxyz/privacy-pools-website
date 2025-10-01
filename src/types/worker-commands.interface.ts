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

export type AddPoolAccountCommand = Parameters<typeof addPoolAccount>[1] & {
  type: 'addPool';
};

export type AddWithdrawalCommand = Parameters<typeof addWithdrawal>[1] & {
  type: 'addWithdrawal';
};

export type AddRagequitCommand = Parameters<typeof addRagequit>[1] & {
  type: 'addRagequit';
};

export interface AccountModificationCommand {
  type: 'modifyAccount';
  payload: AccountRetrievalData & (AddPoolAccountCommand | AddWithdrawalCommand | AddRagequitCommand);
}

export type AddPoolAccountResponse = ReturnType<typeof addPoolAccount> & {
  type: 'poolAdded';
};

export type AddWithdrawalResponse = Awaited<ReturnType<typeof addWithdrawal>> & {
  type: 'withdrawalAdded';
};

export type AddRagequitResponse = Awaited<ReturnType<typeof addRagequit>> & {
  type: 'ragequitAdded';
};

export interface AccountModified {
  type: 'accountModified';
  payload: AddPoolAccountResponse | AddWithdrawalResponse | AddRagequitResponse;
}

export type WorkerMessages = { id: string } & (
  | WithdrawalProved
  | DepositProved
  | RageQuitProved
  | ChainAccountsLoaded
  | PoolsCompleteInfoResponse
  | DepositSecretsCreated
  | AccountModified
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
  | AccountModificationCommand
);

export type WorkerCommandsTypes = WorkerCommands['type'];
export type WorkerMessagesTypes = WorkerMessages['type'];
