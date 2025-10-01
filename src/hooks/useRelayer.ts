'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useChainContext } from '~/hooks';
import { QuoteRequestBody, RelayerResponse, SNQuoteResponse, SNRelayRequestBody } from '~/types';
import { relayerClient } from '~/utils';

export class RelayerError extends Error {}

export type UseRelayerReturn = {
  getQuote: (input: QuoteRequestBody) => Promise<SNQuoteResponse>;
  quoteData: SNQuoteResponse | undefined;
  isQuoteLoading: boolean;
  quoteError: Error | null;
  relay: (input: SNRelayRequestBody) => Promise<RelayerResponse>;
};

export const useRelayer = (): UseRelayerReturn => {
  const { selectedRelayer } = useChainContext();
  const relayerUrl = selectedRelayer?.url;

  const quoteMutation = useMutation<SNQuoteResponse, Error, QuoteRequestBody>({
    mutationFn: async (input: QuoteRequestBody) => {
      if (!relayerUrl) {
        throw new Error('No relayer URL selected for getQuote');
      }
      return relayerClient.fetchQuote(relayerUrl, input);
    },
  });

  const relay = useCallback(
    async (input: SNRelayRequestBody) => {
      if (!relayerUrl) {
        throw new Error('No relayer URL selected for relay');
      }
      const relayerResponse = await relayerClient.relay(relayerUrl, input);
      if (!relayerResponse.success) {
        throw new RelayerError(relayerResponse.error);
      }
      return relayerResponse;
    },
    [relayerUrl],
  );

  return {
    getQuote: quoteMutation.mutateAsync,
    quoteData: quoteMutation.data,
    isQuoteLoading: quoteMutation.isPending,
    quoteError: quoteMutation.error,
    relay,
  };
};
