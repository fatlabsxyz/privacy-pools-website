'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Stack, styled, Theme, Typography } from '@mui/material';
import { useAccount } from '@starknet-react/core';
import { ActivityTable } from '~/components';
import { InfoTooltip } from '~/components/InfoTooltip';
import { ViewAllButton, ViewAllText } from '~/containers';
import { useAdvancedView } from '~/hooks';
import { ROUTER } from '~/utils';

export const ActivityPreview = () => {
  const { push } = useRouter();
  const { address } = useAccount();
  const { previewGlobalEvents, previewPersonalActivity, isLoading } = useAdvancedView();

  const [view, setView] = useState<'global' | 'personal'>('global');

  const historyData = view === 'global' ? previewGlobalEvents : previewPersonalActivity;

  const handleNavigateToPoolAccounts = () => {
    if (view === 'personal') {
      push(ROUTER.activity.children.personal);
    } else {
      push(ROUTER.activity.children.global);
    }
  };

  return (
    <ActivityContainer>
      <Section sx={{ width: '100%' }}>
        <Box>
          <Stack direction='row' alignItems='center' gap={1} sx={{ marginBottom: '1.2rem' }}>
            <Typography variant='subtitle1' fontWeight='bold' lineHeight='1'>
              Activity
            </Typography>
            <InfoTooltip message='This is a log of all of the global and personal activity in Privacy Pools.' />
          </Stack>

          <Stack spacing='1.2rem' direction='row' alignItems='center'>
            <SButton variant='text' onClick={() => setView('global')} active={String(view === 'global')}>
              Global
            </SButton>

            <Divider />

            <SButton
              variant='text'
              onClick={() => setView('personal')}
              active={String(view === 'personal')}
              disabled={!address}
            >
              Personal
            </SButton>
          </Stack>
        </Box>

        <ViewAllButton onClick={handleNavigateToPoolAccounts} disabled={!historyData?.length}>
          <ViewAllText>View All</ViewAllText>
        </ViewAllButton>
      </Section>

      <ActivityTable records={historyData} isLoading={isLoading} view={view} size='small' />
    </ActivityContainer>
  );
};

const ActivityContainer = styled(Box)(({ theme }) => ({
  border: '1px solid',
  borderColor: theme.palette.grey[900],
  width: '100%',
  maxWidth: '82rem',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}));

const Section = styled(Stack)(() => ({
  padding: '1.6rem',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'space-between',
}));

const Divider = styled(Box)(({ theme }) => ({
  height: '1.3rem',
  width: '1px',
  background: theme.palette.divider,
}));

const SButton = styled(Button)<{ active: string; theme?: Theme }>(({ theme, active }) => ({
  textTransform: 'none',
  fontWeight: 700,
  padding: '0',
  minWidth: '0',
  width: 'auto',
  height: 'unset',
  lineHeight: '1',
  opacity: active === 'true' ? 1 : 0.2,
  '&.MuiButtonBase-root.MuiButton-root:hover': {
    background: theme.palette.grey[50],
  },
}));
