import { Address } from '@fatsolutions/privacy-pools-core-starknet-sdk';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  txHash?: Address;
}
