import { BigNumberish, validateAndParseAddress } from 'starknet';
import { ValidAddress } from '~/types/address';

export const toAddress: (addressLike: BigNumberish) => ValidAddress = validateAndParseAddress as never;
