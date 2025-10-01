import { FeesResponse, RelayerResponse, QuoteRequestBody, SNRelayRequestBody, SNQuoteResponse } from '~/types';

interface FetchClient {
  fetchFees: (relayerUrl: string, assetAddress: string) => Promise<FeesResponse>;
  relay: (relayerUrl: string, input: SNRelayRequestBody) => Promise<RelayerResponse>;
  fetchQuote: (relayerUrl: string, input: QuoteRequestBody) => Promise<SNQuoteResponse>;
  ping: (relayerUrl: string) => Promise<null>;
}

const fetchClient: FetchClient = {
  // fetchFees: async (relayerUrl: string, chainId: string, assetAddress: string) => {
  //   const response = await fetch(`${relayerUrl}/relayer/details?chainId=${chainId}&assetAddress=${assetAddress}`);
  //   const data = await response.json();
  //   return data;
  // },
  fetchFees: async (relayerUrl: string, assetAddress: string) => {
    const response = await fetch(`${relayerUrl}/details?assetAddress=${assetAddress}`);
    const data = await response.json();
    return data;
  },
  relay: async (relayerUrl: string, payload: SNRelayRequestBody) => {
    const response = await fetch(`${relayerUrl}/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Relay request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  },
  fetchQuote: async (relayerUrl: string, { amount, asset, recipient, extraGas }: QuoteRequestBody) => {
    const response = await fetch(`${relayerUrl}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          amount,
          asset,
          recipient,
          extraGas,
        },
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch quote: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  },
  ping: async (relayerUrl) => {
    const response = await fetch(`${relayerUrl}/ping`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Relayer offline');
    }
    return null;
  },
};

export const relayerClient = fetchClient;
