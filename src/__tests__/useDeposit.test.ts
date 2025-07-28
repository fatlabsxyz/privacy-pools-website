import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as wagmi from 'wagmi';
import * as accountContext from '../hooks/context/useAccountContext';
import * as chainContext from '../hooks/context/useChainContext';
import * as notificationsContext from '../hooks/context/useNotificationsContext';
import * as poolAccountsContext from '../hooks/context/usePoolAccountsContext';
import { useDeposit } from '../hooks/useDeposit';
import * as modalHooks from '../hooks/useModal';
import * as utils from '../utils';
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

// Mock all the dependencies
jest.mock('wagmi');
jest.mock('../utils/eip7702');
jest.mock('../utils/safe');
jest.mock('../hooks/useModal');
jest.mock('../hooks/context/useChainContext');
jest.mock('../hooks/context/useAccountContext');
jest.mock('../hooks/context/useNotificationsContext');
jest.mock('../hooks/context/usePoolAccountsContext');
jest.mock('~/config');

// Mock the config
jest.mock('~/config', () => ({
  getConfig: () => ({
    env: { TEST_MODE: false },
    constants: { DEFAULT_ASSET: 'ETH' },
  }),
}));

describe('useDeposit Hook with Batching', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockChainId = 11155111;
  const mockWalletClient = {
    writeContract: jest.fn(),
  };
  const mockPublicClient = {
    simulateContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
    readContract: jest.fn(),
  };

  const mockPoolInfo = {
    assetAddress: '0xtoken123',
    entryPointAddress: '0xentrypoint123',
    asset: 'USDC',
    scope: '1',
  };

  const mockAccountService = {
    generateSecrets: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    });

    (wagmi.useWalletClient as jest.Mock).mockReturnValue({
      data: mockWalletClient,
    });

    (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

    (wagmi.useSwitchChain as jest.Mock).mockReturnValue({
      switchChainAsync: jest.fn().mockResolvedValue(undefined),
    });

    // Mock hooks using ES6 imports
    jest.spyOn(modalHooks, 'useModal').mockReturnValue({
      setModalOpen: jest.fn(),
      setIsClosable: jest.fn(),
    } as unknown as ReturnType<typeof modalHooks.useModal>);

    jest.spyOn(chainContext, 'useChainContext').mockReturnValue({
      chainId: mockChainId,
      selectedPoolInfo: mockPoolInfo,
      balanceBN: { decimals: 18 },
    } as unknown as ReturnType<typeof chainContext.useChainContext>);

    jest.spyOn(accountContext, 'useAccountContext').mockReturnValue({
      accountService: mockAccountService,
      poolAccounts: [],
      addPoolAccount: jest.fn(),
    } as unknown as ReturnType<typeof accountContext.useAccountContext>);

    jest.spyOn(notificationsContext, 'useNotifications').mockReturnValue({
      addNotification: jest.fn(),
      getDefaultErrorMessage: jest.fn((msg) => msg),
    } as unknown as ReturnType<typeof notificationsContext.useNotifications>);

    jest.spyOn(poolAccountsContext, 'usePoolAccountsContext').mockReturnValue({
      amount: '1.0',
      setTransactionHash: jest.fn(),
      vettingFeeBPS: 100,
    } as unknown as ReturnType<typeof poolAccountsContext.usePoolAccountsContext>);

    // Mock utility functions
    (eip7702Utils.supportsEIP7702Batching as jest.Mock).mockResolvedValue(false);
    (eip7702Utils.sendBatchTransaction as jest.Mock).mockResolvedValue('0xbatch123');
    (eip7702Utils.getBatchStatus as jest.Mock).mockResolvedValue({
      status: 200,
      receipts: [{ transactionHash: '0xapprove123' }, { transactionHash: '0xdeposit123' }],
    });
    (eip7702Utils.createApprovalDepositBatch as jest.Mock).mockReturnValue([
      { to: '0xtoken', data: '0xapprove', value: '0x0' },
      { to: '0xentry', data: '0xdeposit', value: '0x0' },
    ]);

    (safeUtils.detectSafeEnvironment as jest.Mock).mockResolvedValue({
      isSafe: false,
      safeType: 'Not Safe',
    });

    // Mock createDepositSecrets using ES6 imports
    jest.spyOn(utils, 'createDepositSecrets').mockReturnValue({
      nullifier: '0xnullifier' as const,
      secret: '0xsecret' as const,
      precommitment: '0xprecommitment' as const,
    });

    // Mock decodeEventsFromReceipt using ES6 imports
    jest.spyOn(utils, 'decodeEventsFromReceipt').mockReturnValue([
      {
        eventName: 'Deposited',
        args: {
          _commitment: 123n,
          _label: 456n,
          _value: 1000000000000000000n,
        },
      },
    ]);

    // Mock allowance check
    mockPublicClient.readContract.mockResolvedValue(0n); // No allowance initially
  });

  describe('Standard ETH Deposits', () => {
    beforeEach(() => {
      jest.spyOn(chainContext, 'useChainContext').mockReturnValue({
        chainId: mockChainId,
        selectedPoolInfo: { ...mockPoolInfo, asset: 'ETH' },
        balanceBN: { decimals: 18 },
      } as unknown as ReturnType<typeof chainContext.useChainContext>);
    });

    it('should handle ETH deposits without batching', async () => {
      mockPublicClient.simulateContract.mockResolvedValue({
        request: { to: '0xentry', data: '0xdeposit' },
      });
      mockWalletClient.writeContract.mockResolvedValue('0xtxhash');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        blockNumber: 123n,
        logs: [],
      });

      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(eip7702Utils.sendBatchTransaction).not.toHaveBeenCalled();
    });
  });

  describe('MetaMask Smart Account Batching', () => {
    beforeEach(() => {
      (eip7702Utils.supportsEIP7702Batching as jest.Mock).mockResolvedValue(true);
    });

    it('should use MetaMask Smart Account batching for ERC20 deposits', async () => {
      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(eip7702Utils.supportsEIP7702Batching).toHaveBeenCalledWith(mockAddress, mockChainId);
      expect(eip7702Utils.createApprovalDepositBatch).toHaveBeenCalled();
      expect(eip7702Utils.sendBatchTransaction).toHaveBeenCalled();
      expect(eip7702Utils.getBatchStatus).toHaveBeenCalled();
    });

    it('should poll for batch status until completion', async () => {
      (eip7702Utils.getBatchStatus as jest.Mock)
        .mockResolvedValueOnce({ status: 100 }) // PENDING
        .mockResolvedValueOnce({ status: 100 }) // PENDING
        .mockResolvedValueOnce({
          status: 200, // CONFIRMED
          receipts: [{ transactionHash: '0xapprove123' }, { transactionHash: '0xdeposit123' }],
        });

      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(eip7702Utils.getBatchStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle batch transaction failures', async () => {
      (eip7702Utils.getBatchStatus as jest.Mock).mockResolvedValue({
        status: 400, // FAILED
      });

      const { result } = renderHook(() => useDeposit());

      await expect(result.current.deposit()).rejects.toThrow('Batch transaction failed with status: 400');
    });

    it('should handle batch transaction timeout', async () => {
      (eip7702Utils.getBatchStatus as jest.Mock).mockResolvedValue({
        status: 100, // Always PENDING
      });

      const { result } = renderHook(() => useDeposit());

      await expect(result.current.deposit()).rejects.toThrow('Batch transaction timed out');
    });
  });

  describe('Safe Wallet Batching', () => {
    beforeEach(() => {
      (safeUtils.detectSafeEnvironment as jest.Mock).mockResolvedValue({
        isSafe: true,
        safeType: 'Safe App',
        safeInfo: { safeAddress: '0xsafe123' },
      });
      (safeUtils.sendSafeBatchTransaction as jest.Mock).mockResolvedValue('0xsafetx123');
    });

    it('should use Safe wallet batching for Safe App environment', async () => {
      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(safeUtils.detectSafeEnvironment).toHaveBeenCalled();
      expect(safeUtils.createSafeBatchTransaction).toHaveBeenCalled();
      expect(safeUtils.sendSafeBatchTransaction).toHaveBeenCalled();
    });

    it('should handle Safe App transaction proposal', async () => {
      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(safeUtils.sendSafeBatchTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ to: expect.any(String) })]),
      );
    });
  });

  describe('Standard Flow Fallback', () => {
    it('should fall back to standard flow when no batching available', async () => {
      mockWalletClient.writeContract
        .mockResolvedValueOnce('0xapprove123') // Approve tx
        .mockResolvedValueOnce('0xdeposit123'); // Deposit tx

      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        blockNumber: 123n,
        logs: [],
      });

      mockPublicClient.simulateContract.mockResolvedValue({
        request: { to: '0xentry', data: '0xdeposit' },
      });

      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2); // Approve + Deposit
    });

    it('should skip approval if sufficient allowance exists', async () => {
      mockPublicClient.readContract.mockResolvedValue(2000000000000000000n); // 2 ETH allowance
      mockPublicClient.simulateContract.mockResolvedValue({
        request: { to: '0xentry', data: '0xdeposit' },
      });
      mockWalletClient.writeContract.mockResolvedValue('0xdeposit123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        blockNumber: 123n,
        logs: [],
      });

      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1); // Only deposit
    });
  });

  describe('Error Handling', () => {
    it('should handle contract simulation errors', async () => {
      mockPublicClient.simulateContract.mockRejectedValue(new Error('PrecommitmentAlreadyUsed()'));

      const { result } = renderHook(() => useDeposit());

      await expect(result.current.deposit()).rejects.toThrow('Precommitment already used');
    });

    it('should handle missing dependencies', async () => {
      jest.spyOn(accountContext, 'useAccountContext').mockReturnValue({
        accountService: null,
        poolAccounts: [],
        addPoolAccount: jest.fn(),
      } as unknown as ReturnType<typeof accountContext.useAccountContext>);

      const { result } = renderHook(() => useDeposit());

      await expect(result.current.deposit()).rejects.toThrow('AccountService not found');
    });

    it('should handle wallet client errors', async () => {
      mockWalletClient.writeContract.mockRejectedValue(new Error('User rejected'));

      const { result } = renderHook(() => useDeposit());

      await expect(result.current.deposit()).rejects.toThrow('User rejected');
    });
  });

  describe('Loading State', () => {
    it('should manage loading state correctly', async () => {
      let resolveDeposit: (value: unknown) => void;
      const depositPromise = new Promise((resolve) => {
        resolveDeposit = resolve;
      });

      mockWalletClient.writeContract.mockReturnValue(depositPromise);

      const { result } = renderHook(() => useDeposit());

      // Start deposit
      const depositPromiseResult = result.current.deposit();

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve deposit
      resolveDeposit!('0xtxhash');
      await depositPromiseResult;

      // Should not be loading anymore
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Test Mode', () => {
    beforeEach(() => {
      jest.doMock('~/config', () => ({
        getConfig: () => ({
          env: { TEST_MODE: true },
          constants: { DEFAULT_ASSET: 'ETH' },
        }),
      }));
    });

    it('should use mock flow in test mode', async () => {
      const { result } = renderHook(() => useDeposit());

      await result.current.deposit();

      // In test mode, no actual transactions should be made
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });
});
