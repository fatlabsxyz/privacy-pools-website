import { getConfig } from '~/config';
import { MtRootResponse, PoolResponse, MtLeavesResponse, DepositsByLabelResponse, AllEventsResponse } from '~/types';

const {
  constants: { ITEMS_PER_PAGE },
} = getConfig();

const SCOPE_HEADER = 'X-Pool-Scope';

const fetchJWT = async (): Promise<string> => {
  const response = await fetch('/api/token');
  if (!response.ok) throw new Error('Failed to get token');
  const { token } = await response.json();
  return token;
};

const fetchPublic = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
  return response.json();
};

const fetchPrivate = async <T>(url: string, headers?: Record<string, string>): Promise<T> => {
  const token = await fetchJWT();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });

  if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
  return response.json();
};

const aspClient = {
  fetchPoolInfo: (aspUrl: string, chainId: string, scope: string) =>
    fetchPublic<PoolResponse>(`${aspUrl}/${chainId}/public/pool-info`, {
      headers: {
        [SCOPE_HEADER]: scope,
      },
    }),

  fetchAllEvents: (aspUrl: string, chainId: string, scope: string, page = 1, perPage = ITEMS_PER_PAGE) =>
    fetchPrivate<AllEventsResponse>(`${aspUrl}/${chainId}/private/events/${scope}?page=${page}&perPage=${perPage}`),

  fetchDepositsByLabel: (aspUrl: string, chainId: string, scope: string, labels: string[]) =>
    fetchPrivate<DepositsByLabelResponse>(`${aspUrl}/${chainId}/private/deposits/${scope}`, {
      'X-labels': labels.join(','),
    }),

  fetchMtRoots: (aspUrl: string, chainId: string, scope: string) =>
    fetchPublic<MtRootResponse>(`${aspUrl}/${chainId}/public/mt-roots`, {
      headers: {
        [SCOPE_HEADER]: scope,
      },
    }),

  fetchMtLeaves: (aspUrl: string, chainId: string, scope: string) =>
    fetchPrivate<MtLeavesResponse>(`${aspUrl}/${chainId}/public/mt-leaves`, {
      [SCOPE_HEADER]: scope,
    }),
};

export { aspClient };
