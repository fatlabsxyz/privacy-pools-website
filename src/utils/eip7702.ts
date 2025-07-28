'use client';

import { type Address, encodeFunctionData, parseAbi } from 'viem';

export type AccountType = 'Standard EOA' | 'MetaMask Smart Account' | 'Unknown Smart Account' | 'Unknown';

// MetaMask Smart Account Capability Detection
interface WalletCapabilities {
  [chainId: string]: {
    atomic?: {
      status: 'supported' | 'ready' | 'unsupported';
    };
    atomicBatch?: {
      supported: 'supported' | 'ready' | 'unsupported';
    };
  };
}

interface BatchCall {
  to: string;
  data?: string;
  value?: string;
}

interface SendCallsParams {
  version: string;
  from: string;
  chainId: string;
  atomicRequired?: boolean;
  calls: BatchCall[];
}

interface BatchStatus {
  version: string;
  id: string;
  chainId: string;
  atomic: boolean;
  status: number; // MetaMask uses numeric status codes: 100 = pending, 200 = confirmed, 400+ = failed
  receipts?: Array<{
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
    status: string;
    blockHash: string;
    blockNumber: string;
    gasUsed: string;
    transactionHash: string;
  }>;
}

// Type for ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Checks if the wallet supports MetaMask Smart Account atomic batching
 */
export const checkBatchingCapability = async (address: Address, chainId: number): Promise<boolean> => {
  try {
    console.log('🔍 Checking batching capability for:', { address, chainId });

    const ethereum = window.ethereum as EthereumProvider | undefined;
    if (!ethereum) {
      console.log('❌ No window.ethereum found');
      return false;
    }

    const chainIdHex = `0x${chainId.toString(16)}`;
    console.log('📞 Calling wallet_getCapabilities with params:', [address, [chainIdHex]]);

    const capabilities = (await ethereum.request({
      method: 'wallet_getCapabilities',
      params: [address, [chainIdHex]],
    })) as WalletCapabilities;

    console.log('📋 Full capabilities response:', JSON.stringify(capabilities, null, 2));

    const chainCapabilities = capabilities[chainIdHex];
    console.log('🔗 Chain capabilities:', chainCapabilities);

    // Check both possible formats that MetaMask might use
    const atomicSupport = chainCapabilities?.atomic?.status;
    const atomicBatchSupport = chainCapabilities?.atomicBatch?.supported;
    console.log('⚛️ Atomic support (new format):', atomicSupport);
    console.log('⚛️ Atomic batch support (old format):', atomicBatchSupport);

    // Support both formats
    const isSupported =
      atomicSupport === 'supported' ||
      atomicSupport === 'ready' ||
      atomicBatchSupport === 'supported' ||
      atomicBatchSupport === 'ready';
    console.log('✅ Final batching capability result:', isSupported);

    return isSupported;
  } catch (error) {
    console.error('❌ Failed to check batching capability:', error);
    return false;
  }
};

/**
 * Fallback method to check if account has bytecode (EIP-7702 delegation)
 */
export const checkAccountBytecode = async (address: Address): Promise<boolean> => {
  try {
    console.log('🔍 Checking account bytecode for EIP-7702 delegation');

    // Create a simple JSON-RPC request to check bytecode
    const ethereum = window.ethereum as EthereumProvider | undefined;
    const response = (await ethereum?.request({
      method: 'eth_getCode',
      params: [address, 'latest'],
    })) as string | undefined;

    console.log('📄 Account bytecode:', response);
    const hasBytecode = !!(response && response !== '0x' && response.length > 2);
    console.log('✅ Has bytecode (delegated):', hasBytecode);

    return hasBytecode;
  } catch (error) {
    console.error('❌ Failed to check account bytecode:', error);
    return false;
  }
};

/**
 * Detects account type using multiple detection methods
 */
export const detectAccountType = async (address: Address, chainId: number): Promise<AccountType> => {
  try {
    console.log('🔍 Detecting account type for:', { address, chainId });

    // Method 1: Try capability detection first
    let supportsBatching = await checkBatchingCapability(address, chainId);

    // Method 2: If capability detection fails, try bytecode check
    if (!supportsBatching) {
      console.log('⚠️ Capability detection failed, trying bytecode check...');
      const hasBytecode = await checkAccountBytecode(address);

      if (hasBytecode) {
        console.log('✅ Account has bytecode, assuming MetaMask Smart Account');
        supportsBatching = true;
      }
    }

    const accountType = supportsBatching ? 'MetaMask Smart Account' : 'Standard EOA';
    console.log('🎯 Final account type:', accountType);

    return accountType;
  } catch (error) {
    console.error('❌ Failed to detect account type:', error);
    return 'Unknown';
  }
};

/**
 * Checks if the current account supports EIP-7702 batching using proper API
 */
export const supportsEIP7702Batching = async (address: Address, chainId: number): Promise<boolean> => {
  return await checkBatchingCapability(address, chainId);
};

/**
 * Sends a batch of transactions using MetaMask Smart Account wallet_sendCalls API
 */
export const sendBatchTransaction = async (calls: BatchCall[], address: Address, chainId: number): Promise<string> => {
  console.log('🚀 Sending batch transaction:', { calls, address, chainId });

  const ethereum = window.ethereum as EthereumProvider | undefined;
  if (!ethereum) {
    throw new Error('MetaMask not available');
  }

  const params: SendCallsParams = {
    version: '2.0.0',
    from: address,
    chainId: `0x${chainId.toString(16)}`,
    atomicRequired: true,
    calls: calls,
  };

  console.log('📦 Batch params:', JSON.stringify(params, null, 2));

  try {
    const response = (await ethereum.request({
      method: 'wallet_sendCalls',
      params: [params],
    })) as { id: string };

    console.log('✅ Batch transaction response:', response, 'Type:', typeof response);

    // Extract the ID from the response object
    const batchId = response.id;
    console.log('✅ Extracted batch ID:', batchId, 'Type:', typeof batchId);

    if (!batchId || typeof batchId !== 'string') {
      throw new Error(`Invalid batch ID received: ${JSON.stringify(response)}`);
    }

    return batchId;
  } catch (error) {
    console.error('❌ Failed to send batch transaction:', error);
    throw error;
  }
};

/**
 * Tracks the status of a batch transaction
 */
export const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
  console.log('📊 Getting batch status for ID:', batchId, typeof batchId);

  const ethereum = window.ethereum as EthereumProvider | undefined;
  if (!ethereum) {
    throw new Error('MetaMask not available');
  }

  // Ensure batchId is a string
  const batchIdString = typeof batchId === 'string' ? batchId : String(batchId);
  console.log('📊 Calling wallet_getCallsStatus with:', batchIdString);

  try {
    const status = (await ethereum.request({
      method: 'wallet_getCallsStatus',
      params: [batchIdString],
    })) as BatchStatus;

    console.log('📊 Batch status response:', status);
    return status;
  } catch (error) {
    console.error('❌ Failed to get batch status:', error);
    throw error;
  }
};

/**
 * Creates the batch calls for approval + deposit
 */
export const createApprovalDepositBatch = (
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint,
  vettingFeeBPS: bigint,
  depositTarget: Address,
  depositData: `0x${string}`,
): BatchCall[] => {
  console.log('🏗️ Creating batch calls:', { tokenAddress, spenderAddress, amount, vettingFeeBPS });

  // IMPORTANT: Based on the standard flow in useDeposit.ts line 177,
  // the approval should only be for the deposit amount, not amount + fee
  // The deposit contract handles the fee internally
  const approvalAmount = amount;

  console.log('💰 Approval amount (deposit only):', approvalAmount);

  // Encode approve call
  const approveData = encodeFunctionData({
    abi: parseAbi(['function approve(address spender, uint256 amount) external returns (bool)']),
    functionName: 'approve',
    args: [spenderAddress, approvalAmount],
  });

  console.log('📝 Batch calls created:', {
    approve: { to: tokenAddress, data: approveData },
    deposit: { to: depositTarget, data: depositData },
  });

  return [
    {
      to: tokenAddress,
      data: approveData,
      value: '0x0',
    },
    {
      to: depositTarget,
      data: depositData,
      value: '0x0',
    },
  ];
};
