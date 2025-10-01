import { useState, useCallback } from 'react';
import { generateMerkleProof, StarknetAddress, WithdrawalProof } from '@fatsolutions/privacy-pools-core-starknet-sdk';
import { addBreadcrumb } from '@sentry/nextjs';
// import { getConfig } from '~/config';
import { parseUnits } from 'viem/utils';
import { useQuoteContext } from '~/contexts/QuoteContext';
import {
  useExternalServices,
  useAccountContext,
  useModal,
  useNotifications,
  usePoolAccountsContext,
  useChainContext,
} from '~/hooks';
import { ModalType, Secret } from '~/types';
import {
  prepareWithdrawRequest,
  getContext,
  getMerkleProof,
  verifyWithdrawalProof,
  prepareWithdrawalProofInput,
  waitForEvents,
  getScope,
  getDeposits,
} from '~/utils';
import { useSdk } from './useWorkerSdk';

const PRIVACY_POOL_ERRORS = {
  'Error: InvalidProof()': 'Failed to verify withdrawal proof. Please regenerate your proof and try again.',
  'Error: InvalidCommitment()':
    'The commitment you are trying to spend does not exist. Please check your transaction history.',
  'Error: InvalidProcessooor()': 'You are not authorized to perform this withdrawal operation.',
  'Error: InvalidTreeDepth()':
    'Invalid tree depth provided. Please refresh and try again, contact support if error persists.',
  'Error: InvalidDepositValue()': 'The deposit amount is invalid. Maximum allowed value exceeded.',
  'Error: ScopeMismatch()':
    'Invalid scope provided for this privacy pool. Please refresh and try again, contact support if error persists.',
  'Error: ContextMismatch()':
    'Invalid context provided for this pool and withdrawal. Please refresh and try again, contact support if error persists.',
  'Error: UnknownStateRoot()':
    'The state root is unknown or outdated. Please refresh and try again, contact support if error persists.',
  'Error: IncorrectASPRoot()':
    'The ASP root is unknown or outdated. Please refresh and try again, contact support if error persists.',
  'Error: OnlyOriginalDepositor()': 'Only the original depositor can ragequit from this commitment.',
} as const;

export const useWithdraw = () => {
  const { addNotification, getDefaultErrorMessage } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const { withdraw: sdkWithdraw, createWithdrawalSecrets } = useSdk();
  const { chain } = useChainContext();
  const { setModalOpen, setIsClosable } = useModal();
  const { aspData, relayerData } = useExternalServices();
  const { resetQuote, quoteState } = useQuoteContext();
  const {
    selectedPoolInfo,
    balanceBN: { decimals },
    relayersData,
    selectedRelayer,
  } = useChainContext();

  const { accountService, addWithdrawal, seed } = useAccountContext();

  const {
    amount,
    target,
    poolAccount,
    proof,
    setProof,
    withdrawal,
    setWithdrawal,
    newSecretKeys,
    setNewSecretKeys,
    setTransactionHash,
    feeBPSForWithdraw,
  } = usePoolAccountsContext();

  const commitment = poolAccount?.lastCommitment;
  const aspLeaves = aspData.mtLeavesData?.aspLeaves;
  const stateLeaves = aspData.mtLeavesData?.stateTreeLeaves;
  // const { address } = useAccount();

  // const logErrorToSentry = useCallback(
  //   (error: Error | unknown, context: Record<string, unknown>) => {
  //     // Filter out expected user behavior errors
  //     if (error && typeof error === 'object') {
  //       const message = (error as { message?: string }).message || '';
  //       const errorName = (error as { name?: string }).name || '';
  //       const errorCode = (error as { code?: number }).code;

  //       // Don't log wallet rejections and user behavior errors
  //       if (
  //         errorCode === 4001 ||
  //         errorCode === 4100 ||
  //         errorCode === 4200 ||
  //         errorCode === -32002 ||
  //         errorCode === -32003 ||
  //         message.includes('User rejected the request') ||
  //         message.includes('User denied') ||
  //         message.includes('User cancelled') ||
  //         message.includes('Pop up window failed to open') ||
  //         message.includes('provider is not defined') ||
  //         message.includes('No Ethereum provider found') ||
  //         message.includes('Connection timeout') ||
  //         message.includes('Request timeout') ||
  //         message.includes('Transaction cancelled') ||
  //         message.includes('Chain switching failed') ||
  //         errorName === 'UserRejectedRequestError'
  //       ) {
  //         console.warn('Filtered wallet user behavior error (not logging to Sentry)');
  //         return;
  //       }
  //     }

  //     withScope((scope) => {
  //       scope.setUser({
  //         address: address,
  //       });

  //       // Set additional context
  //       scope.setContext('withdrawal_context', {
  //         chainId,
  //         poolAddress: selectedPoolInfo?.address,
  //         entryPointAddress: selectedPoolInfo?.entryPointAddress,
  //         amount: amount?.toString(),
  //         target,
  //         hasPoolAccount: !!poolAccount,
  //         hasCommitment: !!commitment,
  //         hasAspLeaves: !!aspLeaves,
  //         hasStateLeaves: !!stateLeaves,
  //         hasSelectedRelayer: !!selectedRelayer?.url,
  //         selectedRelayer,
  //         testMode: TEST_MODE,
  //         ...context,
  //       });

  //       // Set tags for filtering
  //       scope.setTag('operation', 'withdraw');
  //       scope.setTag('chain_id', chainId?.toString());
  //       scope.setTag('test_mode', TEST_MODE.toString());

  //       // Log the error
  //       captureException(error);
  //     });
  //   },
  //   [
  //     address,
  //     chainId,
  //     selectedPoolInfo?.address,
  //     selectedPoolInfo?.entryPointAddress,
  //     selectedRelayer,
  //     amount,
  //     target,
  //     poolAccount,
  //     commitment,
  //     aspLeaves,
  //     stateLeaves,
  //   ],
  // );

  const getPrivacyPoolErrorMessage = useCallback((errorMessage: string): string | null => {
    // Check for exact matches first
    for (const [contractError, userMessage] of Object.entries(PRIVACY_POOL_ERRORS)) {
      if (errorMessage.includes(contractError)) {
        return userMessage;
      }
    }

    // Check for error function names without "Error:" prefix
    const errorFunctionMatch = errorMessage.match(/(\w+)\(\)/);
    if (errorFunctionMatch) {
      const errorFunction = `Error: ${errorFunctionMatch[1]}()`;
      if (errorFunction in PRIVACY_POOL_ERRORS) {
        return PRIVACY_POOL_ERRORS[errorFunction as keyof typeof PRIVACY_POOL_ERRORS];
      }
    }

    return null;
  }, []);

  const generateProof = useCallback(
    async (
      onProgress?: (progress: {
        phase: 'loading_circuits' | 'generating_proof' | 'verifying_proof';
        progress: number;
      }) => void,
      onComplete?: (
        proof: {
          withdrawalProof: WithdrawalProof;
          calldata: bigint[];
        },
        completeWithdrawal: typeof withdrawal,
        newSecretKeys: Record<'secret' | 'nullifier', Secret>,
      ) => void,
    ) => {
      // Check for valid quote data immediately
      // if (!feeBPSForWithdraw || feeBPSForWithdraw === 0n || !feeCommitment) {
      //   throw new Error('No valid quote available. Please ensure you have a valid quote before withdrawing.');
      // }

      // if (TEST_MODE) return;

      const relayerDetails = relayersData.find((r) => r.url === selectedRelayer?.url);

      const missingFields = [];
      if (!poolAccount) missingFields.push('poolAccount');
      if (!target) missingFields.push('target');
      if (!commitment) missingFields.push('commitment');
      // if (!aspLeaves) missingFields.push('aspLeaves');
      // if (!stateLeaves) missingFields.push('stateLeaves');
      if (!relayerDetails) missingFields.push('relayerDetails');
      if (!relayerDetails?.relayerAddress) missingFields.push('relayerAddress');
      // if (!feeBPSForWithdraw) missingFields.push('feeBPS');
      if (!accountService) missingFields.push('accountService');

      if (missingFields.length > 0) {
        console.error('❌ Missing required data for proof generation:', missingFields);
        throw new Error(`Missing required data: ${missingFields.join(', ')}`);
      }

      let aspLeavesToUse = aspLeaves?.map(BigInt) || [];
      let sateLeavesToUse = stateLeaves?.map(BigInt) || [];
      const relayerAddressToUse: `0x${string}` = relayerDetails?.relayerAddress as never;
      const feeBPSToUSe: string = feeBPSForWithdraw.toString() || '250';
      const deposits = await getDeposits(selectedPoolInfo);

      const aspRootHasBeenUpdated = new Promise<void>((resolve) => {
        const labels = deposits.map((d) => d.label).join(' ');
        console.log('Copy these labels, update the ASP Root and then call "rootHasBeenUpdated". Labels:');
        console.log(labels);
        (window as unknown as { rootHasBeenUpdated: () => void }).rootHasBeenUpdated = () => {
          resolve();
        };
      });

      await aspRootHasBeenUpdated;

      // TypeScript assertions - we've already validated these exist above
      if (!relayerDetails || !relayerDetails.relayerAddress) {
        // relayerAddressToUse = address!;
        throw new Error('Relayer details not available');
      }
      if (!seed) {
        throw new Error('Seed missing.');
      }
      if (!commitment) {
        throw new Error('Commitment not available');
      }
      if (!accountService) {
        throw new Error('Account service not available');
      }
      if (!stateLeaves) {
        sateLeavesToUse = deposits.map((a) => a.commitment);
        // throw new Error('State leaves not available');
      }
      if (!aspLeaves) {
        aspLeavesToUse = deposits.map((a) => a.label);
        // throw new Error('ASP leaves not available');
      }

      let poolScope: StarknetAddress | undefined;
      let stateMerkleProof: Awaited<ReturnType<typeof getMerkleProof>>;
      let aspMerkleProof: Awaited<ReturnType<typeof getMerkleProof>>;
      // let merkleProofGenerated = false;

      try {
        const newWithdrawal = prepareWithdrawRequest(
          target as `0x${string}`,
          relayerAddressToUse,
          feeBPSToUSe,
          // feeBPSForWithdraw.toString(),
          selectedPoolInfo,
        );

        poolScope = selectedPoolInfo.scope;
        stateMerkleProof = generateMerkleProof(sateLeavesToUse, commitment.hash);
        aspMerkleProof = generateMerkleProof(aspLeavesToUse, commitment.label);
        const context = await getContext(newWithdrawal, poolScope);
        const { secret, nullifier } = await createWithdrawalSecrets({ commitment, seed, chain });

        aspMerkleProof.index = Object.is(aspMerkleProof.index, NaN) ? 0 : aspMerkleProof.index; // workaround for NaN index, SDK issue

        const withdrawalProofInput = prepareWithdrawalProofInput(
          parseUnits(amount, decimals),
          stateMerkleProof,
          aspMerkleProof,
          BigInt(context),
          secret,
          nullifier,
        );
        // if (aspMerkleProof && stateMerkleProof) merkleProofGenerated = true;

        const proof = await sdkWithdraw({ commitment, input: withdrawalProofInput });

        const verified = await verifyWithdrawalProof(proof);

        if (!verified) throw new Error('Proof verification failed');

        setProof(proof as never);
        setWithdrawal(newWithdrawal);
        setNewSecretKeys({ secret, nullifier });

        if (onProgress) {
          onProgress({ phase: 'verifying_proof', progress: 1.0 });
        }

        // Signal that proof generation is complete
        if (onComplete) {
          onComplete(proof, newWithdrawal, { secret, nullifier });
        }

        return proof;
      } catch (err) {
        const error = err as Error;

        // Log proof generation error to Sentry
        // logErrorToSentry(error, {
        //   operation_step: 'proof_generation',
        //   error_type: error?.name || 'unknown',
        //   has_pool_scope: !!poolScope,
        //   merkle_proof_generated: merkleProofGenerated,
        //   proof_verified: false,
        // });

        const errorMessage = getDefaultErrorMessage(error?.message);
        addNotification('error', errorMessage);
        console.error('Error generating proof', error);
        throw error;
      }
    },
    [
      relayersData,
      poolAccount,
      target,
      commitment,
      accountService,
      aspLeaves,
      stateLeaves,
      feeBPSForWithdraw,
      selectedPoolInfo,
      seed,
      selectedRelayer?.url,
      createWithdrawalSecrets,
      chain,
      amount,
      decimals,
      sdkWithdraw,
      setProof,
      setWithdrawal,
      setNewSecretKeys,
      getDefaultErrorMessage,
      addNotification,
    ],
  );

  const withdraw = useCallback(
    async (
      ...[proofData, withdrawalData, secretKeysData]: Parameters<
        Exclude<Parameters<typeof generateProof>[1], undefined>
      >
    ) => {
      // Use passed data if available, otherwise use state
      const currentProof = proofData || proof;
      const currentWithdrawal = withdrawalData || withdrawal;
      const currentNewSecretKeys = secretKeysData || newSecretKeys;
      const relayerDetails = relayersData.find((r) => r.url === selectedRelayer?.url);

      if (
        !currentProof ||
        !currentWithdrawal ||
        !commitment ||
        !target ||
        !relayerDetails ||
        !relayerDetails.relayerAddress ||
        !currentNewSecretKeys ||
        !accountService
      )
        throw new Error('Missing required data to withdraw');

      const scope = await getScope(selectedPoolInfo);

      try {
        setIsClosable(false);
        setIsLoading(true);

        // Reset the quote timer when transaction starts
        resetQuote();

        const res = await relayerData.relay({
          feeCommitment: quoteState.quoteCommitment!,
          scope,
          withdrawal: currentWithdrawal,
          ...currentProof.withdrawalProof,
        });

        const txHash = res.txHash as `0x${string}`;

        const receipts = await waitForEvents('Withdraw', txHash, selectedPoolInfo as never);
        if (!receipts.length) throw new Error('Receipt not found');
        const [{ withdrawnValue, blockNumber }] = receipts;

        setTransactionHash(txHash);
        setModalOpen(ModalType.PROCESSING);

        addWithdrawal({
          parentCommitment: commitment,
          value: poolAccount?.balance - withdrawnValue,
          nullifier: (currentNewSecretKeys as { nullifier?: unknown })?.nullifier as Secret,
          secret: (currentNewSecretKeys as { secret?: unknown })?.secret as Secret,
          blockNumber: BigInt(blockNumber!),
          txHash: txHash,
        });

        // Log successful withdrawal to Sentry for analytics
        addBreadcrumb({
          message: 'Withdrawal successful',
          category: 'transaction',
          data: {
            transactionHash: txHash,
            blockNumber: blockNumber?.toString(),
            value: withdrawnValue.toString(),
          },
          level: 'info',
        });

        setModalOpen(ModalType.SUCCESS);
      } catch (err) {
        const error = err as Error;

        // Log withdrawal error to Sentry with full context
        // logErrorToSentry(error, {
        //   operation_step: 'withdrawal_execution',
        //   error_type: error?.name || 'unknown',
        //   short_message: error?.shortMessage,
        //   has_proof: !!currentProof,
        //   has_withdrawal: !!currentWithdrawal,
        //   has_new_secret_keys: !!currentNewSecretKeys,
        //   pool_scope: poolScope?.toString(),
        // });

        // Try to get a user-friendly error message
        const privacyPoolError = getPrivacyPoolErrorMessage(error?.message || '');
        const errorMessage = privacyPoolError || getDefaultErrorMessage(error?.message);
        setModalOpen(ModalType.NONE);

        addNotification('error', errorMessage);
        console.error('Error withdrawing', error);
      }
      setIsLoading(false);
      setIsClosable(true);
    },
    [
      proof,
      withdrawal,
      newSecretKeys,
      relayersData,
      commitment,
      target,
      accountService,
      selectedPoolInfo,
      setIsClosable,
      selectedRelayer?.url,
      resetQuote,
      relayerData,
      quoteState.quoteCommitment,
      setTransactionHash,
      setModalOpen,
      addWithdrawal,
      poolAccount?.balance,
      getPrivacyPoolErrorMessage,
      getDefaultErrorMessage,
      addNotification,
    ],
  );

  const generateProofAndWithdraw = useCallback(
    async (
      onProgress?: (progress: {
        phase: 'loading_circuits' | 'generating_proof' | 'verifying_proof';
        progress: number;
      }) => void,
    ) => {
      try {
        // Generate proof and call withdraw when complete
        await generateProof(onProgress, (proof, withdrawal, newSecretKeys) => {
          withdraw(proof, withdrawal, newSecretKeys);
        });
      } catch (error) {
        console.error('❌ generateProofAndWithdraw failed:', error);
        throw error;
      }
    },
    [generateProof, withdraw],
  );

  return { withdraw, generateProof, generateProofAndWithdraw, isLoading };
};
