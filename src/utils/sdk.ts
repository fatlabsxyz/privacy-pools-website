'use client';

import {
  Circuits,
  CommitmentProof,
  WithdrawalProofInput,
  Secret,
  generateMerkleProof,
  Hash,
  AccountService,
  PrivacyPoolAccount,
  AccountCommitment,
  // ChainConfig,
  StarknetDataService,
  PrivacyPoolStarknetSDK,
  getCommitment,
  computeContext,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { Address } from '@starknet-react/chains';
import { AbiEventName } from 'node_modules/@fatsolutions/privacy-pools-core-starknet-sdk/dist/data.service';
import { Call, RpcProvider, validateAndParseAddress } from 'starknet';
import { Hex } from 'viem';
import { ChainData, chainData, PoolInfo, whitelistedChains } from '~/config';
import { PoolAccount, ReviewStatus, WithdrawalRelayerPayload } from '~/types';
import { getTimestampFromBlockNumber } from '~/utils';
import { delay } from './promises';
import { toAddress } from './adresses';

const chainDataByWhitelistedChains = Object.values(chainData).filter(
  (chain) => chain.poolInfo.length > 0 && whitelistedChains.some((c) => c.id.toString() === chain.poolInfo[0].chainId),
);

const poolsByChain = chainDataByWhitelistedChains.flatMap(
  (chain) => chain.poolInfo,
) as ChainData[keyof ChainData]['poolInfo'];

// Lazy load circuits only when needed
let circuits: Circuits | null = null;
let sdk: PrivacyPoolStarknetSDK | null = null;

interface ISNContractProps {
  entryPoint: Address;
}

const initializeSDK = () => {
  if (!circuits) {
    // Ensure we have a valid baseUrl (client-side only)
    const currentBaseUrl = globalThis?.location.origin;
    if (!currentBaseUrl) {
      throw new Error('SDK can only be initialized on client-side');
    }
    circuits = new Circuits({ baseUrl: currentBaseUrl });
    sdk = new PrivacyPoolStarknetSDK(circuits);
  }
  return sdk!;
};

const pools: (PoolInfo & { chainId: number; scope: Hash })[] = poolsByChain as never;

// const dataServiceConfig: ChainConfig[] = poolsByChain.map((pool) => {
//   return {
//     chainId: pool.chainId as never,
//     privacyPoolAddress: pool.address,
//     startBlock: pool.deploymentBlock,
//     rpcUrl: chainData[pool.chainId].sdkRpcUrl,
//     apiKey: 'sdk', // It's not an api key https://viem.sh/docs/clients/public#key-optional
//   };
// });
const chain = chainDataByWhitelistedChains[0];
export const snRpcProvider = new RpcProvider({
  nodeUrl: chain.rpcUrl,
});

const dataService = new StarknetDataService(snRpcProvider as never);

/**
 * Generates a zero-knowledge proof for a commitment using Poseidon hash.
 *
 * @param value - The value being committed to
 * @param label - Label associated with the commitment
 * @param nullifier - Unique nullifier for the commitment
 * @param secret - Secret key for the commitment
 * @returns Promise resolving to proof and public signals
 * @throws {ProofError} If proof generation fails
 */
export const generateRagequitProof = async (commitment: AccountCommitment): Promise<CommitmentProof> => {
  const sdkInstance = initializeSDK();
  return await sdkInstance.proveCommitment(commitment.value, commitment.label, commitment.nullifier, commitment.secret);
};

/**
 * Verifies a commitment proof.
 *
 * @param proof - The commitment proof to verify
 * @param publicSignals - Public signals associated with the proof
 * @returns Promise resolving to boolean indicating proof validity
 * @throws {ProofError} If verification fails
 */
export const verifyRagequitProof = async ({ proof, publicSignals }: CommitmentProof) => {
  const sdkInstance = initializeSDK();
  return await sdkInstance.verifyCommitment({ proof, publicSignals });
};

/**
 * Generates a withdrawal proof.
 *
 * @param commitment - Commitment to withdraw
 * @param input - Input parameters for the withdrawal
 * @param withdrawal - Withdrawal details
 * @returns Promise resolving to withdrawal payload
 * @throws {ProofError} If proof generation fails
 */
export const generateWithdrawalProof = async (commitment: AccountCommitment, input: WithdrawalProofInput) => {
  const sdkInstance = initializeSDK();
  return await sdkInstance.proveWithdrawalSN(
    {
      preimage: {
        label: commitment.label,
        value: commitment.value,
        precommitment: {
          hash: BigInt('0x1234') as Hash,
          nullifier: commitment.nullifier,
          secret: commitment.secret,
        },
      },
      hash: commitment.hash,
      nullifierHash: BigInt('0x1234') as Hash,
    },
    input,
  );
};

export const getContext = async (
  withdrawal: {
    processor: string;
    data: string[];
  },
  scope: Hash,
) => {
  return computeContext(withdrawal, scope);
};

export const relay = async ({
  poolInfo,
  withdraw,
  proof,
}: {
  poolInfo: PoolInfo;
  withdraw: Parameters<typeof getContext>[0];
  proof: bigint[];
}) => {
  const sdk = initializeSDK();
  const contract = sdk.createSNContractInstance(poolInfo.entryPointAddress, snRpcProvider as never);
  const scope = (await contract.getScope(poolInfo.address)) as Hash;
  return contract.relay(withdraw, proof, scope);
};

export const getScope = async (poolInfo: PoolInfo) => {
  const sdk = initializeSDK();
  const contract = sdk.createSNContractInstance(poolInfo.entryPointAddress, snRpcProvider as never);
  return toAddress(await contract.getScope(poolInfo.address));
};

export const getDeposits = async (poolInfo: PoolInfo) => {
  return dataService.getDeposits(poolInfo as never);
};

export const getMerkleProof = async (leaves: bigint[], leaf: bigint) => {
  return generateMerkleProof(leaves, leaf);
};

export const verifyWithdrawalProof = async (proof: Awaited<ReturnType<typeof generateWithdrawalProof>>) => {
  const sdkInstance = initializeSDK();
  return true;
  return await sdkInstance.verifyWithdrawal(proof as never);
};

export const createAccount = (seed: string) => {
  const accountService = new AccountService(dataService as never, { mnemonic: seed });

  return accountService;
};

export const loadAccount = async (seed: string) => {
  // const { account } = await AccountService.initializeWithEvents(dataService as never, { mnemonic: seed }, pools);
  const account = new AccountService(dataService as never, { mnemonic: seed });
  await account.retrieveHistory(pools);
  return account;
};

export const createDepositSecrets = (accountService: AccountService, scope: Hash, index: bigint) => {
  return accountService.createDepositSecrets(scope, index);
};

export const createWithdrawalSecrets = (accountService: AccountService, commitment: AccountCommitment) => {
  return accountService.createWithdrawalSecrets(commitment);
};

export const deposit = async ({
  amount,
  token,
  entryPoint,
  precommitment,
}: {
  amount: bigint;
  entryPoint: Address;
  token: Address;
  precommitment: bigint;
}) => {
  const sdk = initializeSDK();
  const contract = sdk.createSNContractInstance(entryPoint, snRpcProvider as never);
  const result = (await contract.approveAndDeposit(entryPoint, token, amount, precommitment)) as Call[];
  return result;
};

export const waitForEvents = async <T extends keyof typeof AbiEventName>(
  event: T,
  txHash: string,
  poolInfo: (typeof pools)[number],
  maxRetries = 3,
) => {
  const getTx = () => dataService.getTxEvents(AbiEventName[event], txHash, poolInfo);
  let retry = 0;
  let retryTime = 1000;
  let tx: Awaited<ReturnType<typeof getTx>> & { blockNumber: bigint }[] = [];
  do {
    tx = (await getTx().catch(() => delay((retryTime *= 2)).then(() => []))) as never;
  } while (tx.length === 0 && retry++ < maxRetries);
  return tx;
};

export const withdraw = async ({
  entryPoint,
  withdrawalData,
  withdrawalProof,
  scope,
}: {
  amount: bigint;
  entryPoint: Address;
  token: Address;
  precommitment: bigint;
  withdrawalData: WithdrawalRelayerPayload;
  withdrawalProof: bigint[];
  scope: bigint;
}) => {
  const sdk = initializeSDK();
  const contract = sdk.createSNContractInstance(entryPoint, snRpcProvider as never);
  return contract.withdraw(withdrawalData, withdrawalProof, scope as Hash);
};

export const rageQuit = async ({
  entryPoint,
  poolAddress,
  value,
  label,
  secret,
  nullifier,
}: ISNContractProps & {
  poolAddress: Address;
  value: bigint;
  label: bigint;
  secret: Secret;
  nullifier: Secret;
}) => {
  const sdk = initializeSDK();
  const contract = sdk.createSNContractInstance(entryPoint, snRpcProvider as never);
  const commitment = getCommitment(value, label, nullifier, secret);
  const { calldata } = await sdk.proveCommitmentSN(commitment);
  return contract.ragequit(calldata, poolAddress);
};

export const addPoolAccount = (
  accountService: AccountService,
  newPoolAccount: {
    scope: bigint;
    value: bigint;
    nullifier: Secret;
    secret: Secret;
    label: Hash;
    blockNumber: bigint;
    txHash: Hex;
  },
) => {
  const accountInfo = accountService.addPoolAccount(
    newPoolAccount.scope as Hash,
    newPoolAccount.value,
    newPoolAccount.nullifier,
    newPoolAccount.secret,
    newPoolAccount.label,
    newPoolAccount.blockNumber,
    newPoolAccount.txHash,
  );

  return accountInfo;
};

export const addWithdrawal = async (
  accountService: AccountService,
  withdrawalParams: {
    parentCommitment: AccountCommitment;
    value: bigint;
    nullifier: Secret;
    secret: Secret;
    blockNumber: bigint;
    txHash: Hex;
  },
) => {
  return accountService.addWithdrawalCommitment(
    withdrawalParams.parentCommitment,
    withdrawalParams.value,
    withdrawalParams.nullifier,
    withdrawalParams.secret,
    withdrawalParams.blockNumber,
    withdrawalParams.txHash,
  );
};

export const addRagequit = async (
  accountService: AccountService,
  ragequitParams: {
    label: Hash;
    ragequit: {
      ragequitter: string;
      commitment: Hash;
      label: Hash;
      value: bigint;
      blockNumber: bigint;
      transactionHash: Hex;
    };
  },
) => {
  return accountService.addRagequitToAccount(ragequitParams.label, ragequitParams.ragequit);
};

export const getPoolAccountsFromAccount = async (account: PrivacyPoolAccount, chainId: string) => {
  const paMap = account.poolAccounts.entries();
  const poolAccounts = [];

  for (const [_scope, _poolAccounts] of paMap) {
    let idx = 1;

    for (const poolAccount of _poolAccounts) {
      const lastCommitment =
        poolAccount.children.length > 0 ? poolAccount.children[poolAccount.children.length - 1] : poolAccount.deposit;

      const _chainId = Object.keys(chainData).find((key) =>
        chainData[key].poolInfo.some((pool) => pool.scope === _scope),
      );

      const updatedPoolAccount = {
        ...(poolAccount as PoolAccount),
        balance: lastCommitment!.value,
        lastCommitment: lastCommitment,
        reviewStatus: ReviewStatus.PENDING,
        isValid: false,
        name: idx,
        scope: _scope,
        chainId: _chainId!,
      };

      updatedPoolAccount.deposit.timestamp = await getTimestampFromBlockNumber(
        poolAccount.deposit.blockNumber,
        snRpcProvider,
      );

      if (updatedPoolAccount.children.length > 0) {
        updatedPoolAccount.children.forEach(async (child) => {
          child.timestamp = await getTimestampFromBlockNumber(child.blockNumber, snRpcProvider);
        });
      }

      if (updatedPoolAccount.ragequit) {
        updatedPoolAccount.balance = 0n;
        updatedPoolAccount.reviewStatus = ReviewStatus.EXITED;
      }

      if (updatedPoolAccount.ragequit) {
        updatedPoolAccount.ragequit.timestamp = await getTimestampFromBlockNumber(
          updatedPoolAccount.ragequit.blockNumber,
          snRpcProvider,
        );
      }

      poolAccounts.push(updatedPoolAccount);
      idx++;
    }
  }

  const poolAccountsByChainScope = poolAccounts.reduce(
    (acc, curr) => {
      acc[`${curr.chainId}-${curr.scope}`] = [...(acc[`${curr.chainId}-${curr.scope}`] || []), curr];
      return acc;
    },
    {} as Record<string, PoolAccount[]>,
  );
  const poolAccountsByCurrentChain = poolAccounts.filter((pa) => pa.chainId === chainId);

  return { poolAccounts: poolAccountsByCurrentChain, poolAccountsByChainScope };
};
