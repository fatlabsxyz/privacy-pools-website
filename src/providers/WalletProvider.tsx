'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@rainbow-me/rainbowkit/styles.css';

type Props = {
  children: React.ReactNode;
};

const queryClient = new QueryClient();

export function WalletProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider modalSize='compact' theme={darkTheme()}>
        {children}
      </RainbowKitProvider>
    </QueryClientProvider>
  );
}
