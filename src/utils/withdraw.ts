import { Contract, FunctionAbi, RpcProvider } from 'starknet';
import { AbiEvent, Address, getAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { LeafInsertedLog } from '~/types';
import { leafInserted, scope } from '~/utils';

const scopeAbi = [
  {
    name: 'scope',
    type: 'function',
    inputs: [],
    outputs: [
      {
        name: '_scope',
        type: 'core::integer::u64',
      },
    ],
  },
] as const satisfies [FunctionAbi];

export const getScope = async (provider: RpcProvider, poolAddress: Address) => {
  const contract = new Contract(scopeAbi, poolAddress, provider);
  const poolScope = (await contract.call('scope')) as bigint;

  if (!poolScope) throw new Error('Pool scope not found');

  return poolScope;
};

export const getStateTreeLeaves = async (
  publicClient: ReturnType<typeof usePublicClient>,
  poolAddress: Address,
  index: bigint,
) => {
  const logs = await publicClient?.getLogs({
    address: getAddress(poolAddress),
    event: leafInserted as unknown as AbiEvent,
    fromBlock: index,
    toBlock: 'latest',
  });

  if (!logs) throw new Error('State tree leaves not found');

  return logs.map((log) => (log as unknown as LeafInsertedLog).args._leaf);
};
