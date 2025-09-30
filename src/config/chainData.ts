import { StarknetAddress, toAddress } from '@fatsolutions/privacy-pools-core-starknet-sdk';
import {
  Chain,
  mainnet,
  // sepolia,
  devnet,
} from '@starknet-react/chains';
import { parseEther } from 'viem/utils';
import { getEnv } from '~/config/env';
// import daiIcon from '~/assets/icons/dai.svg';
import mainnetIcon from '~/assets/icons/mainnet_color.svg';
const { ALCHEMY_KEY, IS_TESTNET, ASP_ENDPOINT } = getEnv();

// Add chains to the whitelist to be used in the app
const mainnetChains: readonly [Chain, ...Chain[]] = [mainnet];
const testnetChains: readonly [Chain, ...Chain[]] = [
  // sepolia,
  devnet,
];

export const whitelistedChains = IS_TESTNET ? testnetChains : mainnetChains;

export type ChainAssets = 'ETH' | 'USDS' | 'sUSDS' | 'DAI' | 'USDC' | 'USDT' | 'wstETH' | 'wBTC' | 'STRK';

export interface PoolInfo {
  chainId: string;
  address: StarknetAddress;
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
  // [sepolia.id.toString()]: {
  //   name: sepolia.name,
  //   symbol: sepolia.nativeCurrency.symbol,
  //   decimals: sepolia.nativeCurrency.decimals,
  //   image: mainnetIcon.src,
  //   explorerUrl: sepolia.explorers.voyager.at(0)!,
  //   sdkRpcUrl: `/api/hypersync-rpc?chainId=${sepolia.id.toString()}`, // Secure Hypersync proxy (relative URL)
  //   rpcUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${ALCHEMY_KEY}` as const,
  //   aspUrl: ASP_ENDPOINT,
  //   relayers: [
  //     { name: 'Testnet Relay', url: 'https://testnet-relayer.privacypools.com' },
  //     { name: 'Freedom Relay', url: 'https://fastrelay.xyz' },
  //     { name: 'FatRelay', url: 'http://localhost:3000' },
  //   ],
  //   poolInfo: [
  //     {
  //       chainId: sepolia.id.toString(),
  //       asset: 'ETH' as const,
  //       assetAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' as const,
  //       assetDecimals: 18,
  //       address: '0x597dbf977e6939840eafceaf1016281246c8bd49d068bde3b44b074df4f646b' as const,
  //       scope: 0x5448b936fbc76a4d45a638d23b884cf31f2b1bede31e9fce22952c2424fc70n as const,
  //       entryPointAddress: '0x789930ae23678435d62ff7994da2c7c02c18e364d1529e1ec352a2b481c4f4a' as const,
  //       maxDeposit: parseEther('1'),
  //       deploymentBlock: 1446670n,
  //     },
  //   ],
  // },
  [devnet.id.toString()]: {
    name: devnet.name,
    symbol: devnet.nativeCurrency.symbol,
    decimals: devnet.nativeCurrency.decimals,
    image: mainnetIcon.src,
    explorerUrl: '',
    sdkRpcUrl: `/api/hypersync-rpc?chainId=${devnet.id.toString()}`, // Secure Hypersync proxy (relative URL)
    rpcUrl: `http://localhost:5050/rpc` as const,
    aspUrl: ASP_ENDPOINT,
    relayers: [{ name: 'FatRelay', url: 'http://localhost:3000' }],
    poolInfo: [
      // {
      //   chainId: devnet.id.toString(),
      //   asset: 'ETH' as const,
      //   assetAddress: toAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'),
      //   assetDecimals: 18,
      //   address: toAddress('0x5f31bfa4bda4cac510ce3235b58f5595b6097e59f2bd554ff3bc19d779a90f'),
      //   scope: toAddress(0x5448b936fbc76a4d45a638d23b884cf31f2b1bede31e9fce22952c2424fc70n),
      //   entryPointAddress: toAddress('0x248be73ad9087517e4624c29ce4ac84a76c8b4791205baa6856970e32ef6794'),
      //   maxDeposit: parseEther('10'),
      //   deploymentBlock: 1446670n,
      // },
      {
        chainId: devnet.id.toString(),
        asset: 'ETH' as const,
        assetAddress: toAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'),
        assetDecimals: 18,
        address: toAddress('0x75d2f9b6a5e1b41ec2e2081e42c7fe068eeda8d47e7d47ecbd990cf3ed563f1'),
        entryPointAddress: toAddress('0x3156ed949fdae4bd7e0a73d2b7d1b48bfe8ae6ebacb158ef549c150bef5be38'),
        maxDeposit: parseEther('10'),
        deploymentBlock: 1446670n,
      },
      {
        chainId: devnet.id.toString(),
        asset: 'STRK' as const,
        assetAddress: toAddress('0x4718F5A0FC34CC1AF16A1CDEE98FFB20C31F5CD61D6AB07201858F4287C938D'),
        assetDecimals: 18,
        address: toAddress('0x3d6b9f9b173859502afb4c6194d93af7e669bf9f3cbcf0aadf2e93cd17d6729'),
        entryPointAddress: toAddress('0x3156ed949fdae4bd7e0a73d2b7d1b48bfe8ae6ebacb158ef549c150bef5be38'),
        maxDeposit: parseEther('10'),
        deploymentBlock: 1446670n,
      },
    ],
  },
};

export const chainData = IS_TESTNET ? testnetChainData : mainnetChainData;
