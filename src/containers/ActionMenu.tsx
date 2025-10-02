'use client';

import { Button, Stack } from '@mui/material';
import { useAccount } from '@starknet-react/core';
import { useAccountContext, useModal, usePoolAccountsContext, useChainContext } from '~/hooks';
import { EventType, ModalType } from '~/types';

export const ActionMenu = () => {
  const { setModalOpen } = useModal();
  const { address } = useAccount();
  const { setActionType } = usePoolAccountsContext();
  const { hasApprovedDeposit, seed } = useAccountContext();
  const { hasSomeRelayerAvailable, maxDeposit } = useChainContext();

  const isWithdrawDisabled = !address || !hasApprovedDeposit || !seed || !hasSomeRelayerAvailable;
  const isDepositDisabled = !address || !seed || !BigInt(maxDeposit);

  const goToDeposit = () => {
    setModalOpen(ModalType.DEPOSIT);
    setActionType(EventType.DEPOSIT);
  };

  const goToWithdraw = () => {
    setModalOpen(ModalType.WITHDRAW);
    setActionType(EventType.WITHDRAWAL);
  };

  return (
    <Stack direction='row' spacing={2} data-testid='action-menu'>
      <Button disabled={isDepositDisabled} onClick={goToDeposit} data-testid='deposit-button'>
        Deposit
      </Button>
      <Button disabled={isWithdrawDisabled} onClick={goToWithdraw} data-testid='withdraw-button'>
        Withdraw
      </Button>
    </Stack>
  );
};
