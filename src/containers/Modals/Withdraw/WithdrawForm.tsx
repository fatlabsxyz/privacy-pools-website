'use client';

import { ChangeEvent, FocusEventHandler, useCallback, useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Copy, Checkmark } from '@carbon/icons-react';
import { StarknetAddress, toAddress } from '@fatsolutions/privacy-pools-core-starknet-sdk';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  SelectChangeEvent,
  Stack,
  styled,
  TextField,
  Tooltip,
  useTheme,
} from '@mui/material';
import { useStarkAddress, useStarkName } from '@starknet-react/core';
import { Address, formatUnits, parseUnits } from 'viem';
import { CoinIcon, ImageContainer, InputContainer, ModalContainer, ModalTitle } from '~/containers/Modals/Deposit';
import { useChainContext, useAccountContext, useModal, usePoolAccountsContext, useNotifications } from '~/hooks';
import { ModalType } from '~/types';
import { getUsdBalance, relayerClient, truncateAddress, useClipboard } from '~/utils';
import { LinksSection } from '../LinksSection';
import { AmountInputSection } from './AmountInputSection';
import { PoolAccountSelectorSection } from './PoolAccountSelectorSection';
import { RelayerSelectorSection } from './RelayerSelectorSection';

const validateAddress = (address: string) => {
  try {
    return toAddress(address);
  } catch {
    return null;
  }
};

const isAddress = validateAddress;

const minWithdrawCache = new Map<string, string>();

export const WithdrawForm = () => {
  const { setModalOpen } = useModal();
  const { addNotification } = useNotifications();
  const theme = useTheme();

  const {
    balanceBN: { symbol, decimals: balanceDecimals },
    selectedPoolInfo,
    chainId,
    selectedRelayer,
    setSelectedRelayer,
    relayersData,
    price: currentPrice,
  } = useChainContext();

  const { amount, setAmount, target, setTarget, poolAccount, setPoolAccount } = usePoolAccountsContext();
  const { poolAccounts } = useAccountContext();

  const decimals = selectedPoolInfo?.assetDecimals ?? balanceDecimals ?? 18;
  const filteredPoolAccounts = poolAccounts.filter((pa) => pa.balance > 0n);

  // New state for minimum withdrawal amount and warning
  const [minWithdrawAmount, setMinWithdrawAmount] = useState<bigint | null>(null);
  const [isLoadingMinAmount, setIsLoadingMinAmount] = useState(false);
  const [targetAddressHasError, setTargetAddressHasError] = useState(false);

  // ENS-related state
  const [inputValue, setInputValue] = useState<string>(target);
  const [ensName, setEnsName] = useState<string | null>(null);

  // Clipboard for copying resolved address
  const { copied, copyToClipboard } = useClipboard({ timeout: 1400 });

  // Handle copying resolved address
  const handleCopyResolvedAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(target);
  };

  // Resolved address display component
  const ResolvedAddressDisplay = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <span>Resolved to: {truncateAddress(target)}</span>
      <Tooltip title={`${target} (Click to copy)`}>
        <Box
          component='span'
          onClick={handleCopyResolvedAddress}
          sx={{
            ml: 0.5,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {copied ? (
            <Checkmark size={12} color={theme.palette.text.disabled} />
          ) : (
            <Copy size={12} color={theme.palette.text.disabled} />
          )}
        </Box>
      </Tooltip>
    </Box>
  );

  const balanceFormatted = formatUnits(poolAccount?.balance ?? BigInt(0), decimals);
  const balanceUSD = getUsdBalance(currentPrice, balanceFormatted, decimals);

  // ENS hooks
  const isEnsName = useMemo(() => {
    // Must have at least one dot followed by 3+ characters
    const dotIndex = inputValue.lastIndexOf('.');
    if (dotIndex === -1) return false; // No dot found

    const tld = inputValue.slice(dotIndex + 1);
    return tld.length >= 3; // At least 3 characters after the dot
  }, [inputValue]);

  const normalizedName = useMemo(() => {
    if (!isEnsName) return undefined;
    // Simple normalization - just lowercase and trim
    return inputValue.toLowerCase().trim();
  }, [isEnsName, inputValue]);

  const {
    data: starknedAddress,
    isLoading: isLoadingEnsAddress,
    error: ensError,
  } = useStarkAddress({
    name: normalizedName,
  });

  const { data: reverseEnsName } = useStarkName({
    address: isAddress(target) ? (target as Address) : undefined,
  });

  // Effect to handle ENS resolution
  useEffect(() => {
    if (isEnsName && starknedAddress) {
      setTarget(starknedAddress as StarknetAddress);
      setTargetAddressHasError(false);
      setEnsName(inputValue);
      addNotification('success', `ENS name resolved to ${truncateAddress(starknedAddress)}`);
    } else if (isEnsName && !isLoadingEnsAddress && !starknedAddress && normalizedName) {
      if (ensError) {
        console.error('ENS Resolution Error:', ensError);
        addNotification('error', `ENS resolution failed: ${ensError.message || 'Unknown error'}`);
      } else {
        addNotification('error', `Could not resolve ENS name: ${inputValue}`);
      }
      setTargetAddressHasError(true);
    }
  }, [
    starknedAddress,
    isEnsName,
    isLoadingEnsAddress,
    inputValue,
    normalizedName,
    ensError,
    setTarget,
    addNotification,
  ]);

  const amountBN = useMemo(() => {
    try {
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  // Cache key for minimum withdrawal amount
  const cacheKey = useMemo(() => {
    return `${chainId}-${selectedPoolInfo?.assetAddress}-${selectedRelayer?.url}`;
  }, [chainId, selectedPoolInfo?.assetAddress, selectedRelayer?.url]);

  // Calculate remaining balance after withdrawal
  const remainingBalance = useMemo(() => {
    if (!poolAccount?.balance || amountBN <= 0n) return null;
    return poolAccount.balance - amountBN;
  }, [poolAccount?.balance, amountBN]);

  // Check if withdrawal would leave insufficient remaining balance
  const shouldShowMinAmountWarning = useMemo(() => {
    if (!minWithdrawAmount || !remainingBalance || remainingBalance <= 0n) return false;
    return remainingBalance > 0n && remainingBalance < minWithdrawAmount;
  }, [minWithdrawAmount, remainingBalance]);

  // Format minimum withdrawal amount for display
  const minWithdrawFormatted = useMemo(() => {
    if (!minWithdrawAmount) return '';
    return formatUnits(minWithdrawAmount, decimals);
  }, [minWithdrawAmount, decimals]);

  const remainingBalanceFormatted = useMemo(() => {
    if (!remainingBalance) return '';
    return formatUnits(remainingBalance, decimals);
  }, [remainingBalance, decimals]);

  // Fetch minimum withdrawal amount
  const fetchMinWithdrawAmount = useCallback(async () => {
    if (!selectedPoolInfo?.assetAddress || !selectedRelayer?.url) return;

    // Check cache first
    const cachedValue = minWithdrawCache.get(cacheKey);
    if (cachedValue) {
      setMinWithdrawAmount(BigInt(cachedValue));
      return;
    }

    setIsLoadingMinAmount(true);
    try {
      const response = await relayerClient.fetchFees(selectedRelayer.url, selectedPoolInfo.assetAddress);

      const minAmount = BigInt(response.minWithdrawAmount);
      setMinWithdrawAmount(minAmount);

      // Cache the value
      minWithdrawCache.set(cacheKey, response.minWithdrawAmount);
    } catch (error) {
      console.error('Failed to fetch minimum withdrawal amount:', error);
      addNotification('error', 'Failed to fetch minimum withdrawal requirements');
    } finally {
      setIsLoadingMinAmount(false);
    }
  }, [selectedPoolInfo.assetAddress, selectedRelayer?.url, cacheKey, addNotification]);

  // Fetch min amount when user starts entering amount or clicks max
  useEffect(() => {
    if (amount && !minWithdrawAmount && !isLoadingMinAmount) {
      fetchMinWithdrawAmount();
    }
  }, [amount, fetchMinWithdrawAmount, minWithdrawAmount, isLoadingMinAmount]);

  const isValidAmount = useMemo(() => {
    return amountBN > 0n && amountBN <= (poolAccount?.balance ?? 0n);
  }, [amountBN, poolAccount?.balance]);

  const isRecipientAddressValid = useMemo(() => {
    return target !== '' && isAddress(target) && !targetAddressHasError;
  }, [target, targetAddressHasError]);

  const isFormValid = useMemo(() => {
    return (
      isValidAmount &&
      isRecipientAddressValid &&
      // !!selectedRelayer?.url &&
      !!selectedPoolInfo?.assetAddress
    );
  }, [isValidAmount, isRecipientAddressValid, selectedPoolInfo?.assetAddress]);

  // Quote handling moved to Review screen

  const feeText = 'Fee will be calculated on review screen';

  const isWithdrawDisabled = useMemo(() => {
    return !isFormValid;
  }, [isFormValid]);

  const errorMessage = useMemo(() => {
    if (amount && amountBN <= 0n) return 'Withdrawal amount must be greater than 0';
    if (amount && !isValidAmount && amountBN > (poolAccount?.balance ?? 0n))
      return `Maximum withdraw amount is ${formatUnits(poolAccount?.balance ?? 0n, decimals)} ${symbol}`;

    // Show minimum withdrawal warning
    if (shouldShowMinAmountWarning && minWithdrawFormatted) {
      return (
        <>
          Warning: After withdrawal, remaining balance (${remainingBalanceFormatted} ${symbol}) will be below minimum
          withdrawal amount (${minWithdrawFormatted} ${symbol}). You can either:
          <ul>
            <li>Withdraw less</li>
            <li>Use &quot;Max&quot; to withdraw all</li>
            <li>Proceed and exit the rest later to your original deposit address (compromises privacy)</li>
          </ul>
        </>
      );
    }

    return '';
  }, [
    amount,
    amountBN,
    isValidAmount,
    poolAccount?.balance,
    symbol,
    decimals,
    shouldShowMinAmountWarning,
    minWithdrawFormatted,
    remainingBalanceFormatted,
  ]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value
      .replace(/[^0-9.]+/g, '')
      .replace(/(\..*)\..*/g, '$1')
      .slice(0, 20);

    setAmount(newAmount);

    // Fetch min amount when user starts typing
    if (newAmount && !minWithdrawAmount && !isLoadingMinAmount) {
      fetchMinWithdrawAmount();
    }
  };

  const handlePoolAccountChange = (e: SelectChangeEvent<unknown>) => {
    const selectedAccount = filteredPoolAccounts.find((pa) => pa.name.toString() === e.target.value);
    if (selectedAccount) {
      setPoolAccount(selectedAccount);
      setAmount('');
    }
  };

  const handleTargetAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear any previous errors when user is typing
    setTargetAddressHasError(false);

    // If it's a valid address, set it directly
    const parsedAddress = validateAddress(value);
    if (parsedAddress) {
      setTarget(parsedAddress);
      setEnsName(null);
    } else {
      // Check if it looks like a complete ENS name (dot + 3+ chars)
      const dotIndex = value.lastIndexOf('.');
      const isCompleteEns = dotIndex !== -1 && value.slice(dotIndex + 1).length >= 3;

      if (!isCompleteEns) {
        // If it's not a complete ENS name and not a valid address, clear the target
        setTarget('');
        setEnsName(null);
      }
    }
    // ENS resolution will be handled by the useEffect
  };

  const handleTargetAddressBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    if (!value) {
      setTargetAddressHasError(false);
      return;
    }

    // Check if it's a valid address
    if (isAddress(value)) {
      setTargetAddressHasError(false);
      return;
    }

    // Check if it's a valid ENS name format
    const dotIndex = value.lastIndexOf('.');
    const isValidEnsFormat = dotIndex !== -1 && value.slice(dotIndex + 1).length >= 3;

    if (isValidEnsFormat) {
      // If ENS is resolved or still loading, don't show error
      if (starknedAddress || isLoadingEnsAddress || ensName === value) {
        setTargetAddressHasError(false);
      } else {
        // Only show error if ENS resolution failed
        setTargetAddressHasError(!starknedAddress && !isLoadingEnsAddress);
      }
    } else {
      // Not a valid address or ENS format
      setTargetAddressHasError(true);
    }
  };

  const handleRelayerChange = (e: SelectChangeEvent<unknown>) => {
    const newRelayerUrl = e.target.value as string;
    const newRelayer = relayersData.find((r) => r.url === newRelayerUrl);
    setSelectedRelayer(newRelayer ? { name: newRelayer.name, url: newRelayer.url } : undefined);
  };

  const handleUseMax = useCallback(() => {
    if (poolAccount?.balance) {
      setAmount(formatUnits(poolAccount.balance, decimals));
    }
  }, [poolAccount, setAmount, decimals]);

  const handleWithdraw = useCallback(() => {
    // Go directly to Review screen - quote will be requested there
    setModalOpen(ModalType.REVIEW);
  }, [setModalOpen]);

  const assetIcon = useMemo(() => {
    if (selectedPoolInfo?.asset === 'ETH') {
      return <CoinIcon />;
    }

    if (selectedPoolInfo?.icon) {
      return (
        <ImageContainer>
          <Image src={selectedPoolInfo.icon} alt={symbol} width={54} height={34} />
        </ImageContainer>
      );
    }

    return (
      <ImageContainer>
        <span style={{ width: '5.4rem', height: '5.4rem', backgroundColor: 'transparent' }}></span>
      </ImageContainer>
    );
  }, [selectedPoolInfo?.asset, selectedPoolInfo?.icon, symbol]);

  return (
    <ModalContainer>
      <ModalTitle variant='h2'>Make a withdraw</ModalTitle>

      <DecorativeCircle />

      <InputContainer>
        <AmountInputSection
          amount={amount}
          errorMessage={errorMessage}
          handleAmountChange={handleAmountChange}
          handleUseMax={handleUseMax}
          balanceFormatted={balanceFormatted}
          symbol={symbol}
          poolAccountName={poolAccount?.name?.toString()}
          balanceUSD={balanceUSD}
          chainIcon={assetIcon}
        />
      </InputContainer>

      <Stack gap={2} width='100%' maxWidth='32.8rem' zIndex='1'>
        <FormControl fullWidth>
          <Box sx={{ position: 'relative' }}>
            <TextField
              id='target-address'
              placeholder='Target Address or ENS name'
              value={inputValue}
              error={targetAddressHasError}
              onChange={handleTargetAddressChange}
              onBlur={handleTargetAddressBlur}
              spellCheck={false}
              helperText={
                targetAddressHasError ? (
                  'Invalid address or ENS name'
                ) : ensName ? (
                  <ResolvedAddressDisplay />
                ) : reverseEnsName ? (
                  `ENS: ${reverseEnsName}`
                ) : (
                  ''
                )
              }
              data-testid='target-address-input'
              fullWidth
              InputProps={{
                startAdornment: null,
                endAdornment: isLoadingEnsAddress ? <CircularProgress size={20} /> : null,
              }}
            />
          </Box>
        </FormControl>

        <PoolAccountSelectorSection
          poolAccountName={poolAccount?.name?.toString()}
          handlePoolAccountChange={handlePoolAccountChange}
          filteredPoolAccounts={filteredPoolAccounts}
          decimals={decimals}
          symbol={symbol}
        />

        <RelayerSelectorSection
          selectedRelayer={selectedRelayer}
          relayersData={relayersData}
          handleRelayerChange={handleRelayerChange}
          feeText={feeText}
          isQuoteLoading={false}
          quoteError={null}
          isQuoteValid={false}
          countdown={0}
        />
      </Stack>

      <Button
        disabled={isWithdrawDisabled}
        onClick={handleWithdraw}
        data-testid='confirm-withdrawal-button'
        sx={{ zIndex: 2 }}
        startIcon={isLoadingMinAmount ? <CircularProgress size={16} color='inherit' /> : null}
      >
        {isLoadingMinAmount && 'Loading...'}
        {!isLoadingMinAmount && 'Review Withdrawal'}
      </Button>

      <LinksSection />
    </ModalContainer>
  );
};

const DecorativeCircle = styled(Box)(() => {
  return {
    width: '647px',
    height: '646px',
    position: 'absolute',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '1px solid #D9D9D9',
    zIndex: 0,
    top: '84%',
  };
});
// (moved above)
