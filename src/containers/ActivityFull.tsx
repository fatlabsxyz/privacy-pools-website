'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Box, styled } from '@mui/material';
import { ActivityTable, AdvancedNavigation, SPagination } from '~/components';
import { ActionMenuContainer } from '~/containers';
import { useAdvancedView } from '~/hooks';
import { ActivityRecords } from '~/types';

export const ActivityFull = () => {
  const { ITEMS_PER_PAGE, allEventsByPage, fullPersonalActivity, globalEventsCount, isLoading } = useAdvancedView();
  const pathname = usePathname();

  const view = useMemo(() => (pathname.includes('personal') ? 'personal' : 'global'), [pathname]);

  const items = useMemo(
    () => (view === 'global' ? allEventsByPage : fullPersonalActivity),
    [view, allEventsByPage, fullPersonalActivity],
  );

  const totalCount = view === 'global' ? globalEventsCount : fullPersonalActivity.length;

  return (
    <>
      <AdvancedNavigation
        title={view === 'global' ? 'Global Activity' : 'Personal Activity'}
        isLogged={true}
        count={totalCount}
      />

      <ActivityContainer>
        <ActivityTable records={items as ActivityRecords} isLoading={isLoading} view={view} />

        <ActionMenuContainer>
          <SPagination numberOfItems={totalCount} perPage={ITEMS_PER_PAGE} />
        </ActionMenuContainer>
      </ActivityContainer>
    </>
  );
};

const ActivityContainer = styled(Box)(({ theme }) => ({
  border: '1px solid',
  borderColor: theme.palette.grey[900],
  borderTop: 'unset',
  width: '100%',
  maxWidth: '82rem',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}));
