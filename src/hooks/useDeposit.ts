'use client';

import { useState } from 'react';
import {
  Address,
  erc20Abi,
  getAddress,
  parseUnits,
  TransactionExecutionError,
  Hash as ViemHash,
  encodeFunctionData,
} from 'viem';
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { getConfig } from '~/config';
import { useChainContext, useAccountContext, useNotifications, usePoolAccountsContext } from '~/hooks';
import { Hash, ModalType, Secret } from '~/types';
import { depositEventAbi, decodeEventsFromReceipt, createDepositSecrets, entrypointAbi } from '~/utils';
import {
  supportsEIP7702Batching,
  sendBatchTransaction,
  createApprovalDepositBatch,
  getBatchStatus,
} from '~/utils/eip7702';
import { useModal } from './useModal';

const {
  env: { TEST_MODE },
  constants: { DEFAULT_ASSET },
} = getConfig();

export const useDeposit = () => {
  const { address } = useAccount();
  const {
    chainId,
    selectedPoolInfo,
    balanceBN: { decimals },
  } = useChainContext();
  const { addNotification, getDefaultErrorMessage } = useNotifications();
  const { switchChainAsync } = useSwitchChain();
  const { setModalOpen, setIsClosable } = useModal();
  const { amount, setTransactionHash, vettingFeeBPS } = usePoolAccountsContext();
  const [isLoading, setIsLoading] = useState(false);
  const { accountService, poolAccounts, addPoolAccount } = useAccountContext();
  const { data: walletClient } = useWalletClient({ chainId });
  const publicClient = usePublicClient({ chainId });

  const allowance = async (tokenAddress: Address, owner: Address, spender: Address) => {
    if (!publicClient) throw new Error('Public client not found');
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, spender],
    });
  };

  const deposit = async () => {
    try {
      setIsClosable(false);
      setIsLoading(true);
      await switchChainAsync({ chainId });

      if (!accountService) throw new Error('AccountService not found');
      if (!address) throw new Error('Address not found');

      let assetAllowance = 0n;

      if (selectedPoolInfo.asset !== DEFAULT_ASSET) {
        assetAllowance = await allowance(selectedPoolInfo.assetAddress, address, selectedPoolInfo.entryPointAddress);
      }

      const {
        nullifier,
        secret,
        precommitment: precommitmentHash,
      } = createDepositSecrets(accountService, BigInt(selectedPoolInfo.scope) as Hash, BigInt(poolAccounts.length));
      const value = parseUnits(amount, decimals);

      if (!TEST_MODE) {
        if (!walletClient || !publicClient) throw new Error('Wallet or Public client not found');

        if (!selectedPoolInfo.scope || !precommitmentHash || !value)
          throw new Error('Missing required data to deposit');

        let hash: ViemHash;

        if (selectedPoolInfo.asset === DEFAULT_ASSET) {
          // ETH deposits don't need approval, use standard flow
          const { request } = await publicClient
            .simulateContract({
              account: address,
              address: getAddress(selectedPoolInfo.entryPointAddress),
              abi: entrypointAbi,
              functionName: 'deposit',
              args: [precommitmentHash],
              value,
            })
            .catch((err) => {
              if (err?.metaMessages[0] == 'Error: PrecommitmentAlreadyUsed()') {
                throw new Error('Precommitment already used');
              }
              throw err;
            });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { account: _account, ...restRequest } = request;
          hash = await walletClient.writeContract(restRequest);
        } else {
          // ERC-20 token deposits - check for EIP-7702 batching support
          if (!selectedPoolInfo.assetAddress) throw new Error('Asset address missing for token deposit');

          console.log('🔍 Checking EIP-7702 support for:', { address, chainId, assetAllowance, value });
          const supportsEIP7702 = await supportsEIP7702Batching(address, chainId);
          console.log('🎯 EIP-7702 support result:', supportsEIP7702);
          console.log('💰 Allowance check:', { assetAllowance, value, needsApproval: assetAllowance < value });

          if (supportsEIP7702 && assetAllowance < value) {
            console.log('✅ Using Smart Account batching path');
            // True single-transaction batching using MetaMask Smart Account wallet_sendCalls API
            addNotification('info', 'Using Smart Account - batching approval + deposit in single transaction...');

            // Create the deposit call data directly without simulation
            // (simulation would fail because allowance isn't approved yet)
            console.log('🔧 Creating deposit call with args:', {
              asset: selectedPoolInfo.assetAddress,
              value: value.toString(),
              precommitment: precommitmentHash.toString(),
            });

            const depositCallData = encodeFunctionData({
              abi: entrypointAbi,
              functionName: 'deposit',
              args: [selectedPoolInfo.assetAddress, value, precommitmentHash],
            });

            console.log('📝 Created deposit call data:', depositCallData);

            // Create the batch calls
            const batchCalls = createApprovalDepositBatch(
              selectedPoolInfo.assetAddress,
              selectedPoolInfo.entryPointAddress,
              value,
              BigInt(vettingFeeBPS),
              getAddress(selectedPoolInfo.entryPointAddress),
              depositCallData,
            );

            // Send batch transaction using MetaMask Smart Account API
            const batchId = await sendBatchTransaction(batchCalls, address, chainId);

            console.log('🔍 DEBUGGING: Raw batch ID from sendBatchTransaction:', batchId);
            console.log('🔍 DEBUGGING: Type of batch ID:', typeof batchId);
            console.log('🔍 DEBUGGING: JSON.stringify batch ID:', JSON.stringify(batchId));
            console.log('🔍 DEBUGGING: String conversion:', String(batchId));
            console.log('🔍 DEBUGGING: Is it an object?', typeof batchId === 'object');
            if (typeof batchId === 'object') {
              console.log('🔍 DEBUGGING: Object keys:', Object.keys(batchId));
              console.log('🔍 DEBUGGING: Object.values:', Object.values(batchId));
            }

            addNotification('info', 'Batch transaction submitted, waiting for confirmation...');

            // Poll for batch status
            let batchStatus;
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes with 5-second intervals

            do {
              await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
              batchStatus = await getBatchStatus(batchId);
              console.log('📊 Batch status check:', {
                status: batchStatus.status,
                attempts,
                hasReceipts: !!batchStatus.receipts,
              });
              attempts++;
            } while (batchStatus.status === 100 && attempts < maxAttempts); // 100 = PENDING

            if (batchStatus.status >= 400) {
              throw new Error(`Batch transaction failed with status: ${batchStatus.status}`);
            }

            if (batchStatus.status === 100) {
              throw new Error('Batch transaction timed out');
            }

            // Debug the receipt structure
            console.log('🔍 Full batch status:', JSON.stringify(batchStatus, null, 2));
            console.log('📋 Number of receipts:', batchStatus.receipts?.length);
            console.log(
              '📋 Receipt details:',
              batchStatus.receipts?.map((r, i) => ({
                index: i,
                transactionHash: r.transactionHash,
                status: r.status,
                logs: r.logs?.length || 0,
              })),
            );

            // Extract the deposit transaction hash from the batch receipts
            if (!batchStatus.receipts || batchStatus.receipts.length === 0) {
              throw new Error(`No receipts found. Status: ${batchStatus.status}`);
            }

            // Check if we have 1 or 2 receipts and handle accordingly
            let depositReceipt;
            if (batchStatus.receipts.length === 1) {
              // Single receipt might contain both transactions
              console.log('📋 Single receipt found - using it for deposit hash');
              depositReceipt = batchStatus.receipts[0];
            } else if (batchStatus.receipts.length === 2) {
              // Two receipts - deposit is the second one
              console.log('📋 Two receipts found - using second one for deposit hash');
              depositReceipt = batchStatus.receipts[1];
            } else {
              throw new Error(`Unexpected number of receipts: ${batchStatus.receipts.length}`);
            }

            hash = depositReceipt.transactionHash as ViemHash;
            console.log('🎯 Using transaction hash:', hash);

            addNotification('success', 'Smart Account batch transaction confirmed!');
          } else {
            console.log('⚠️ Using standard flow - either no Smart Account support or sufficient allowance');
            // Standard flow - check allowance and approve if needed
            if (assetAllowance < value) {
              addNotification('info', 'Allowance insufficient. Requesting approval...');
              const approveHash = await walletClient.writeContract({
                address: selectedPoolInfo.assetAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [selectedPoolInfo.entryPointAddress, value],
                account: address,
              });

              const approvalReceipt = await publicClient.waitForTransactionReceipt({
                hash: approveHash,
                timeout: 180_000, // 3 minutes timeout for approval transactions
              });
              if (!approvalReceipt) throw new Error('Approval receipt not found');
            }

            const { request } = await publicClient
              .simulateContract({
                account: address,
                address: getAddress(selectedPoolInfo.entryPointAddress),
                abi: entrypointAbi,
                functionName: 'deposit',
                args: [selectedPoolInfo.assetAddress, value, precommitmentHash],
              })
              .catch((err) => {
                if (err?.metaMessages[0] == 'Error: PrecommitmentAlreadyUsed()') {
                  throw new Error('Precommitment already used');
                }
                throw err;
              });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { account: _account, ...restRequest } = request;
            hash = await walletClient.writeContract(restRequest);
          }
        }

        setTransactionHash(hash);
        setModalOpen(ModalType.PROCESSING);

        const receipt = await publicClient?.waitForTransactionReceipt({
          hash,
          timeout: 300_000, // 5 minutes timeout for deposit transactions
        });

        if (!receipt) throw new Error('Receipt not found');

        const events = decodeEventsFromReceipt(receipt, depositEventAbi);
        const depositedEvents = events.filter((event) => event.eventName === 'Deposited');
        if (!depositedEvents.length) throw new Error('Deposited event not found');
        const { _commitment, _label, _value } = depositedEvents[0].args as {
          _commitment: bigint;
          _label: bigint;
          _value: bigint;
        };

        if (!_commitment || !_label) throw new Error('Commitment or label not found');

        addPoolAccount(accountService, {
          scope: selectedPoolInfo.scope,
          value: _value,
          nullifier: nullifier as Secret,
          secret: secret as Secret,
          label: _label as Hash,
          blockNumber: receipt.blockNumber,
          txHash: hash,
        });

        // Show success modal first
        setModalOpen(ModalType.SUCCESS);

        // After a brief delay, check if the deposit might not be visible to users who refresh
        setTimeout(() => {
          addNotification(
            'info',
            `✅ Deposit confirmed! Transaction: ${hash}\n\nNote: If you refresh the page and your deposit doesn't appear immediately, don't worry! Our indexers may need a few minutes to sync. Your funds are safe on-chain.`,
          );
        }, 2000);
      } else {
        // Mock flow
        setModalOpen(ModalType.PROCESSING);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setModalOpen(ModalType.SUCCESS);
      }
    } catch (err) {
      const error = err as TransactionExecutionError;
      addNotification('error', getDefaultErrorMessage(error?.shortMessage || error?.message));
      console.error('Error depositing', error);
    }
    setIsClosable(true);
    setIsLoading(false);
  };

  return { deposit, isLoading };
};
