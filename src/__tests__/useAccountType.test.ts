import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as wagmi from 'wagmi';
import { useAccountType } from '../hooks/useAccountType';
import * as eip7702Utils from '../utils/eip7702';
import * as safeUtils from '../utils/safe';

// Note: @testing-library/react not available in this environment
// Create simple mock implementations
const renderHook = (hookFn: () => unknown) => ({
  result: { current: hookFn() },
  rerender: () => ({ current: hookFn() }),
});

const waitFor = async (fn: () => void) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  fn();
};

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  usePublicClient: jest.fn(),
}));

// Mock chain context
jest.mock('../hooks/context/useChainContext', () => ({
  useChainContext: jest.fn(() => ({ chainId: 11155111 })),
}));

// Mock utils
jest.mock('../utils/eip7702');
jest.mock('../utils/safe');

describe('useAccountType Hook', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockPublicClient = {
    getCode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
      connector: { name: 'MetaMask' },
    });

    (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

    (eip7702Utils.detectAccountType as jest.Mock).mockResolvedValue('Standard EOA');
    (safeUtils.detectSafeEnvironment as jest.Mock).mockResolvedValue({
      isSafe: false,
      safeType: 'Not Safe',
    });
    (safeUtils.isSafeWallet as jest.Mock).mockResolvedValue(false);
  });

  it('should detect MetaMask Smart Account', async () => {
    (eip7702Utils.detectAccountType as jest.Mock).mockResolvedValue('MetaMask Smart Account');

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('MetaMask Smart Account');
    expect(result.current.isSmartAccount).toBe(true);
    expect(result.current.isSafeAccount).toBe(false);
    expect(result.current.supportsBatching).toBe(true);
  });

  it('should detect Safe App environment', async () => {
    (safeUtils.detectSafeEnvironment as jest.Mock).mockResolvedValue({
      isSafe: true,
      safeType: 'Safe App',
      safeInfo: {
        safeAddress: '0xsafe',
        chainId: 11155111,
        owners: ['0xowner1'],
        threshold: 1,
      },
    });

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Safe App');
    expect(result.current.isSmartAccount).toBe(false);
    expect(result.current.isSafeAccount).toBe(true);
    expect(result.current.supportsBatching).toBe(true);
    expect(result.current.safeInfo).toBeDefined();
  });

  it('should detect Safe wallet via address check', async () => {
    (safeUtils.isSafeWallet as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Safe Wallet');
    expect(result.current.isSafeAccount).toBe(true);
    expect(result.current.supportsBatching).toBe(true);
  });

  it('should detect Safe wallet via connector name', async () => {
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
      connector: { name: 'Safe Wallet' },
    });

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Safe Wallet');
    expect(result.current.isSafeAccount).toBe(true);
  });

  it('should detect standard EOA', async () => {
    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Standard EOA');
    expect(result.current.isSmartAccount).toBe(false);
    expect(result.current.isSafeAccount).toBe(false);
    expect(result.current.supportsBatching).toBe(false);
  });

  it('should handle disconnected state', async () => {
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false,
      connector: undefined,
    });

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe(null);
    expect(result.current.supportsBatching).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    (safeUtils.detectSafeEnvironment as jest.Mock).mockRejectedValue(new Error('Detection failed'));

    const { result } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Unknown');
  });

  it('should update when address changes', async () => {
    const { result, rerender } = renderHook(() => useAccountType());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('Standard EOA');

    // Change to Safe wallet
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: '0xnewaddress',
      isConnected: true,
      connector: { name: 'Safe' },
    });

    rerender();

    await waitFor(() => {
      expect(result.current.accountType).toBe('Safe Wallet');
    });
  });

  it('should show loading state during detection', async () => {
    let resolveDetection: (value: unknown) => void;
    const detectionPromise = new Promise((resolve) => {
      resolveDetection = resolve;
    });

    (eip7702Utils.detectAccountType as jest.Mock).mockReturnValue(detectionPromise);

    const { result } = renderHook(() => useAccountType());

    expect(result.current.isLoading).toBe(true);

    resolveDetection!('MetaMask Smart Account');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accountType).toBe('MetaMask Smart Account');
  });
});
