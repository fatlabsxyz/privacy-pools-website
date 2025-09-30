import { StarknetAddress, toAddress } from '@fatsolutions/privacy-pools-core-starknet-sdk';
import {
  Chain,
  mainnet,
  sepolia,
  // devnet,
} from '@starknet-react/chains';
import { parseEther } from 'viem/utils';
import { getEnv } from '~/config/env';
// import daiIcon from '~/assets/icons/dai.svg';
import mainnetIcon from '~/assets/icons/mainnet_color.svg';
const { ALCHEMY_KEY, IS_TESTNET, ASP_ENDPOINT } = getEnv();

// Add chains to the whitelist to be used in the app
const mainnetChains: readonly [Chain, ...Chain[]] = [mainnet];
const testnetChains: readonly [Chain, ...Chain[]] = [
  sepolia,
  // devnet,
];

export const whitelistedChains = IS_TESTNET ? testnetChains : mainnetChains;

export type ChainAssets = 'ETH' | 'USDS' | 'sUSDS' | 'DAI' | 'USDC' | 'USDT' | 'wstETH' | 'wBTC';

export interface PoolInfo {
  chainId: string;
  address: StarknetAddress;
  scope: StarknetAddress;
  deploymentBlock: bigint;
  entryPointAddress: StarknetAddress;
  assetAddress: StarknetAddress;
  maxDeposit: bigint;
  asset: ChainAssets;
  assetDecimals?: number;
  icon?: string;
  isStableAsset?: boolean; // Includes stablecoins and yield-bearing stablecoins
}

export interface ChainData {
  [chainId: string]: {
    name: string;
    symbol: string;
    decimals: number;
    image: string;
    explorerUrl: string;
    sdkRpcUrl: string;
    rpcUrl: string;
    aspUrl: string;
    relayers: {
      name: string;
      url: string;
    }[];
    poolInfo: PoolInfo[];
  };
}

const mainnetChainData: ChainData = {
  // Mainnets
  [mainnet.id.toString()]: {
    name: mainnet.name,
    symbol: mainnet.nativeCurrency.symbol,
    decimals: mainnet.nativeCurrency.decimals,
    image: mainnetIcon.src,
    explorerUrl: mainnet.explorers.voyager.at(0)!,
    relayers: [{ name: 'Fast Relay', url: 'https://fastrelay.xyz' }],
    sdkRpcUrl: `/api/hypersync-rpc?chainId=1`, // Secure Hypersync proxy (relative URL)
    rpcUrl: `${mainnet.rpcUrls.alchemy.http[0]}/${ALCHEMY_KEY}` as const,
    aspUrl: ASP_ENDPOINT,
    poolInfo: [],
  },
};

const testnetChainData: ChainData = {
  // Testnets
  [sepolia.id.toString()]: {
    name: sepolia.name,
    symbol: sepolia.nativeCurrency.symbol,
    decimals: sepolia.nativeCurrency.decimals,
    image: mainnetIcon.src,
    explorerUrl: sepolia.explorers.voyager.at(0)!,
    sdkRpcUrl: `/api/hypersync-rpc?chainId=${sepolia.id.toString()}`, // Secure Hypersync proxy (relative URL)
    rpcUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${ALCHEMY_KEY}` as const,
    aspUrl: ASP_ENDPOINT,
    relayers: [
      // { name: 'FatRelayerLocal', url: 'http://localhost:3000' },
      { name: 'FatRelayer', url: 'https://starknet-relayer-latest-149184580131.us-east1.run.app' },
    ],
    poolInfo: [
      {
        chainId: sepolia.id.toString(),
        asset: 'ETH' as const,
        assetAddress: toAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'),
        assetDecimals: 18,
        address: toAddress('0x0109d3f24af2d03634cb310ed7de9baeca8208667338f7714bf3b70f886e2dd9'),
        scope: toAddress(0x4951be981d6c5ee34f0e825cad898caa01929fae272fa38ca7d1c9083c2933n),
        entryPointAddress: toAddress('0x6fe3b0c2d8b16dcb3aa50d97d63b6a149be8c96cdd0b451497be3d0a95b50e'),
        maxDeposit: parseEther('10'),
        deploymentBlock: 2296635n,
      },
    ],
  },
  // [devnet.id.toString()]: {
  //   name: devnet.name,
  //   symbol: devnet.nativeCurrency.symbol,
  //   decimals: devnet.nativeCurrency.decimals,
  //   image: mainnetIcon.src,
  //   explorerUrl: '',
  //   sdkRpcUrl: `/api/hypersync-rpc?chainId=${devnet.id.toString()}`, // Secure Hypersync proxy (relative URL)
  //   rpcUrl: `http://localhost:5050/rpc` as const,
  //   aspUrl: ASP_ENDPOINT,
  //   relayers: [{ name: 'FatRelay', url: 'http://localhost:3000' }],
  // poolInfo: [
  //   {
  //     chainId: devnet.id.toString(),
  //     asset: 'ETH' as const,
  //     assetAddress: toAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'),
  //     assetDecimals: 18,
  //     address: toAddress('0x5f31bfa4bda4cac510ce3235b58f5595b6097e59f2bd554ff3bc19d779a90f'),
  //     scope: toAddress(0x5448b936fbc76a4d45a638d23b884cf31f2b1bede31e9fce22952c2424fc70n),
  //     entryPointAddress: toAddress('0x248be73ad9087517e4624c29ce4ac84a76c8b4791205baa6856970e32ef6794'),
  //     maxDeposit: parseEther('10'),
  //     deploymentBlock: 1446670n,
  //   },
  // ],
  // },
};

export const chainData = IS_TESTNET ? testnetChainData : mainnetChainData;
