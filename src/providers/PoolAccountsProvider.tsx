'use client';

import { createContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Uint256 } from 'starknet';
import { Address, createPublicClient, getAddress, http } from 'viem';
import { whitelistedChains } from '~/config';
import { useChainContext } from '~/hooks';
import {
  CommitmentProof,
  EventType,
  FeeCommitment,
  HistoryData,
  PoolAccount,
  RagequitProof,
  WithdrawalProof,
  WithdrawalRelayerPayload,
} from '~/types';
import { assetConfig } from '~/utils';

type Withdraw = Omit<WithdrawalRelayerPayload, 'data'> & {
  data: string[];
};

type ContextType = {
  vettingFeeBPS: bigint;
  minimumDepositAmount: bigint;

  // Inputs
  amount: string;
  setAmount: (val: string) => void;
  target: Address | '';
  setTarget: (val: Address | '') => void;
  poolAccount: PoolAccount | undefined;
  setPoolAccount: (val?: PoolAccount) => void;
  resetInputs: () => void;

  // Details modal
  selectedHistoryData?: HistoryData[number];
  setSelectedHistoryData: (data?: HistoryData[number]) => void;

  // Transaction
  proof: WithdrawalProof | RagequitProof | CommitmentProof | null;
  setProof: (val: WithdrawalProof | RagequitProof | CommitmentProof) => void;
  withdrawal: Withdraw | null;
  setWithdrawal: (val: Withdraw) => void;
  newSecretKeys: { secret: bigint; nullifier: bigint } | null;
  setNewSecretKeys: (val: { secret: bigint; nullifier: bigint }) => void;
  transactionHash: Address | undefined;
  setTransactionHash: (val: Address) => void;
  actionType: EventType | undefined;
  setActionType: (val?: EventType) => void;
  feeCommitment: FeeCommitment | null;
  setFeeCommitment: (val: FeeCommitment | null) => void;
  resetTransactionState: () => void;
  isAssetConfigLoading: boolean;
  feeBPSForWithdraw: bigint;
  setFeeBPSForWithdraw: (val: bigint) => void;
};

interface Props {
  children: React.ReactNode;
}

export const PoolAccountsContext = createContext({} as ContextType);

export type TxHash = number | bigint | Uint256;

export const PoolAccountsProvider = ({ children }: Props) => {
  const {
    chainId,
    chain: { rpcUrl },
    selectedPoolInfo,
  } = useChainContext();

  const [actionType, setActionType] = useState<EventType>();
  const [transactionHash, setTransactionHash] = useState<Address>();

  const [amount, setAmount] = useState<string>('');
  const [target, setTarget] = useState<Address | ''>('');
  const [poolAccount, setPoolAccount] = useState<PoolAccount>();

  const [proof, setProof] = useState<ContextType['proof']>(null);
  const [withdrawal, setWithdrawal] = useState<Withdraw | null>(null);
  const [newSecretKeys, setNewSecretKeys] = useState<{ secret: bigint; nullifier: bigint } | null>(null);
  const [feeCommitment, setFeeCommitment] = useState<FeeCommitment | null>(null);
  const [feeBPSForWithdraw, setFeeBPSForWithdraw] = useState<bigint>(BigInt(0));

  const [selectedHistoryData, setSelectedHistoryData] = useState<HistoryData[number]>();

  const resetInputs = () => {
    setAmount('');
    setTarget('');
    setPoolAccount(undefined);
  };

  const resetTransactionState = () => {
    setProof(null);
    setWithdrawal(null);
    setTransactionHash(undefined);
    setActionType(undefined);
    setPoolAccount(undefined);
    setFeeCommitment(null);
    setFeeBPSForWithdraw(BigInt(0));
  };

  // Reset form inputs when asset/chain changes
  useEffect(() => {
    setAmount('');
    setTarget('');
    setPoolAccount(undefined);
  }, [selectedPoolInfo.assetAddress, selectedPoolInfo.chainId]);

  const { data: assetConfigs, isLoading: isAssetConfigLoading } = useQuery({
    queryKey: ['assetConfigs', chainId, selectedPoolInfo.scope.toString()],
    enabled: !!selectedPoolInfo,
    queryFn: async () => {
      const publicClient = createPublicClient({
        chain: whitelistedChains.find((chain) => chain.id.toString() === chainId) as never,
        transport: http(rpcUrl),
      });

      const config = await publicClient.readContract({
        address: getAddress(selectedPoolInfo.entryPointAddress),
        abi: assetConfig,
        functionName: 'assetConfig',
        args: [selectedPoolInfo.assetAddress],
      });

      if (!config) return;

      return {
        privacyPool: config[0],
        minimumDepositAmount: config[1],
        vettingFeeBPS: config[2],
      };
    },
  });

  return (
    <PoolAccountsContext.Provider
      value={{
        amount,
        setAmount,
        target,
        setTarget,
        poolAccount,
        setPoolAccount,
        resetInputs,
        selectedHistoryData,
        setSelectedHistoryData,
        proof,
        setProof,
        withdrawal,
        setWithdrawal,
        newSecretKeys,
        setNewSecretKeys,
        transactionHash,
        setTransactionHash,
        actionType,
        setActionType,
        feeCommitment,
        setFeeCommitment,
        resetTransactionState,
        vettingFeeBPS: assetConfigs?.vettingFeeBPS ?? BigInt(0),
        minimumDepositAmount: assetConfigs?.minimumDepositAmount ?? BigInt(0),
        isAssetConfigLoading,
        feeBPSForWithdraw,
        setFeeBPSForWithdraw,
      }}
    >
      {children}
    </PoolAccountsContext.Provider>
  );
};
