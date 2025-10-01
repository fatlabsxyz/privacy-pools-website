import {
  AccountService,
  StarknetDataService,
  SNContractInteractionsService,
  Hash,
  StarknetAddress,
} from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { RpcProvider } from 'starknet';
import { chainData, CompletePoolInfo, PoolInfo } from '~/config';
import {
  addPoolAccount,
  addRagequit,
  addWithdrawal,
  createDepositSecrets,
  createWithdrawalSecrets,
  deposit,
  generateWithdrawalProof,
  getPoolAccountsFromAccount,
  initializeSDK,
  rageQuit,
} from '~/utils';
import {
  // AccountRetrievalData,
  LoadChainAccountsCommand,
  WorkerCommands,
  WorkerMessages,
} from '../types/worker-commands.interface';

type PoolToRetrieveHistoryFrom = Omit<CompletePoolInfo, 'chainId' | 'scope'> & { chainId: number; scope: Hash };

const sendResponse = <T extends WorkerMessages>(message: T) => {
  self.postMessage(message);
};

const chainAccountsMap = new Map<string, AccountService>();
const poolContractsMap = new Map<string, SNContractInteractionsService>();
const chainProviderMap = new Map<string, RpcProvider>();
const completePoolInfoMap = new Map<string, PoolToRetrieveHistoryFrom[]>();
const sdkInstance = initializeSDK();

const loadProvider = (rpcUrl: string) => {
  let provider = chainProviderMap.get(rpcUrl);
  if (!provider) {
    provider = new RpcProvider({ nodeUrl: rpcUrl });
    chainProviderMap.set(rpcUrl, provider);
  }
  return provider;
};

const initAccountsService = (rpcUrl: string, seed: string) => {
  const provider = loadProvider(rpcUrl);
  const dataService = new StarknetDataService(provider);
  const accountService = new AccountService(dataService as never, { mnemonic: seed });
  chainAccountsMap.set(rpcUrl + seed, accountService);
  return accountService;
};

const loadAccountsService = (rpcUrl: string, seed: string) => {
  return chainAccountsMap.get(rpcUrl + seed) || initAccountsService(rpcUrl, seed);
};

const initPoolContract = (entryPoint: StarknetAddress, rpcUrl: string) => {
  const provider = loadProvider(rpcUrl);
  return sdkInstance.createSNContractInstance(entryPoint, provider);
};

const loadPoolContract = (address: StarknetAddress, rpcUrl: string) => {
  return poolContractsMap.get(address) || initPoolContract(address, rpcUrl);
};

const fillPoolsInfo = async (poolInfo: PoolInfo[], rpcUrl: string): Promise<PoolToRetrieveHistoryFrom[]> => {
  const completePools: PoolToRetrieveHistoryFrom[] = [];
  for (const pool of poolInfo) {
    const poolContract = loadPoolContract(pool.entryPointAddress, rpcUrl);
    const [scope, deploymentBlock] = await Promise.all([
      poolContract.getScope(pool.address),
      poolContract.getPoolDeploymentBlock(pool.address),
    ]);
    completePools.push({
      ...pool,
      chainId: +pool.chainId,
      scope: scope as unknown as Hash,
      deploymentBlock,
    });
  }
  return completePools;
};

const getPoolsInfo = async (poolInfo: PoolInfo[], rpcUrl: string) => {
  let completePoolInfo = completePoolInfoMap.get(rpcUrl);
  if (!completePoolInfo) {
    completePoolInfo = await fillPoolsInfo(poolInfo, rpcUrl);
    completePoolInfoMap.set(rpcUrl, completePoolInfo);
  }
  return completePoolInfo;
};

const loadChainAccounts = async ({
  chain: { rpcUrl, poolInfo },
  seed,
  refetch,
}: LoadChainAccountsCommand['payload']) => {
  const accountService = loadAccountsService(rpcUrl, seed);
  if (refetch) {
    const completePoolInfo = await getPoolsInfo(poolInfo, rpcUrl);
    await accountService.retrieveHistory(completePoolInfo);
  }
  const chainId = poolInfo[0].chainId;
  const provider = loadProvider(rpcUrl);
  return getPoolAccountsFromAccount(accountService.account, chainId, provider);
};

// const getAspLeaves = async ({ chain: { rpcUrl, poolInfo }, seed }: AccountRetrievalData) => {
//   const accountService = loadAccountsService(rpcUrl, seed);
//   const allEventsPromises = poolInfo.map((pool) =>
//     accountService.getDepositEvents({ ...pool, chainId: +pool.chainId, scope: BigInt(pool.scope) as Hash }),
//   );
//   const depositLabels = (await Promise.allSettled(allEventsPromises))
//     .map((p) => (p.status === 'fulfilled' ? [...p.value.values()] : []))
//     .flat()
//     .sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber))
//     .map(({ label }) => label);

//   return depositLabels;
// };

self.onmessage = async (event: MessageEvent<WorkerCommands>) => {
  const command = event.data;
  const { id, type } = command;
  switch (type) {
    case 'generateWithdrawalProof': {
      const { input, commitment } = command.payload;
      const proof = await generateWithdrawalProof({ commitment, input, sdkInstance });
      sendResponse({
        type: 'withdrawalProved',
        payload: proof,
        id: id,
      });
      break;
    }
    case 'createWithdrawSecrets': {
      const { chain, seed, commitment } = command.payload;
      const account = loadAccountsService(chain.rpcUrl, seed);
      const secrets = createWithdrawalSecrets(account, commitment);
      sendResponse({
        type: 'withdrawalSecretsCreated',
        payload: secrets,
        id,
      });
      break;
    }
    case 'generateDepositProve': {
      const payload = await deposit(command.payload);
      sendResponse({
        type: 'depositProved',
        payload,
        id,
      });
      break;
    }
    case 'generateRagequiteProve': {
      const payload = await rageQuit(command.payload);
      sendResponse({
        type: 'rageQuitProved',
        payload,
        id,
      });
      break;
    }
    case 'loadAccounts': {
      const accounts = await loadChainAccounts(command.payload);
      sendResponse({
        type: 'accountsLoaded',
        payload: accounts,
        id,
      });
      break;
    }

    case 'getPoolsInfo': {
      const chainId = command.payload.chainId;
      const pools = chainData[chainId].poolInfo;
      const poolInfo = await getPoolsInfo(pools, chainData[chainId].rpcUrl);
      sendResponse({
        type: 'gottenPoolsInfo',
        payload: poolInfo as unknown as CompletePoolInfo[],
        id,
      });
      break;
    }

    case 'createDepositSecrets': {
      const { chain, seed, scope } = command.payload;
      const account = loadAccountsService(chain.rpcUrl, seed);
      const secrets = createDepositSecrets(account, BigInt(scope) as Hash);
      sendResponse({
        type: 'depositSecretsCreated',
        payload: secrets,
        id,
      });
      break;
    }
    case 'addPool': {
      const { chain, seed } = command.payload;
      const accountService = loadAccountsService(chain.rpcUrl, seed);
      const payload = addPoolAccount(accountService, command.payload);
      sendResponse({
        id,
        type: 'addPool',
        payload,
      });
      break;
    }
    case 'addRagequit': {
      const { chain, seed } = command.payload;
      const accountService = loadAccountsService(chain.rpcUrl, seed);
      const payload = await addRagequit(accountService, command.payload);
      sendResponse({
        id,
        type: 'addRagequit',
        payload,
      });
      break;
    }
    case 'addWithdrawal': {
      const { chain, seed } = command.payload;
      const accountService = loadAccountsService(chain.rpcUrl, seed);
      const payload = await addWithdrawal(accountService, command.payload);
      sendResponse({
        id,
        type: 'addWithdrawal',
        payload,
      });
      break;
    }
  }
};
