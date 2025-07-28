'use client';

import { type Address } from 'viem';

export type SmartWalletType = 'Standard EOA' | 'Safe Wallet' | 'Unknown Smart Contract' | 'Unknown';

// Known contract addresses for detection
export const KNOWN_ADDRESSES = {
  // Safe factory address
  SAFE_FACTORY: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
} as const;

/**
 * Detects if an address is a smart contract by checking bytecode
 */
export const isSmartContract = async (address: Address, provider: unknown): Promise<boolean> => {
  try {
    const code = await provider.getBytecode({ address });
    return code && code !== '0x' && code.length > 2;
  } catch (error) {
    console.error('Error checking bytecode:', error);
    return false;
  }
};

/**
 * Comprehensive smart wallet detection
 */
export const detectSmartWalletType = async (address: Address, provider: unknown): Promise<SmartWalletType> => {
  try {
    console.log('🔍 Detecting smart wallet type for:', address);

    // First check if it's a smart contract
    const isContract = await isSmartContract(address, provider);
    if (!isContract) {
      return 'Standard EOA';
    }

    console.log('📋 Address is a smart contract');

    // For now, we'll return Unknown Smart Contract for all smart contracts
    // Safe detection is handled separately through the Safe SDK
    console.log('❓ Unknown smart contract type');
    return 'Unknown Smart Contract';
  } catch (error) {
    console.error('❌ Error in smart wallet detection:', error);
    return 'Unknown';
  }
};

/**
 * Checks if a smart wallet supports batching
 */
export const supportsSmartWalletBatching = (walletType: SmartWalletType): boolean => {
  const batchingSupportedWallets: SmartWalletType[] = ['Safe Wallet'];

  return batchingSupportedWallets.includes(walletType);
};
