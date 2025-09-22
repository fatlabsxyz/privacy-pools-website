import { StarknetAddress, toAddress } from '@fatsolutions/privacy-pools-core-starknet-sdk';
import {
  Chain,
  mainnet,
  // sepolia,
  devnet,
} from '@starknet-react/chains';
import {
  parseEther,
  // parseUnits
} from 'viem';
import { getEnv } from '~/config/env';
// import daiIcon from '~/assets/icons/dai.svg';
import mainnetIcon from '~/assets/icons/mainnet_color.svg';
// import susdsIcon from '~/assets/icons/susds.svg';
// import usdcIcon from '~/assets/icons/usdc.svg';
// import usdsIcon from '~/assets/icons/usds.svg';
// import usdtIcon from '~/assets/icons/usdt.svg';
// import wbtcIcon from '~/assets/icons/wbtc.svg';
// import wstethIcon from '~/assets/icons/wsteth.svg';

const { ALCHEMY_KEY, IS_TESTNET, ASP_ENDPOINT } = getEnv();

// Add chains to the whitelist to be used in the app
const mainnetChains: readonly [Chain, ...Chain[]] = [mainnet];
const testnetChains: readonly [Chain, ...Chain[]] = [
  // sepolia,
  devnet,
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
    // poolInfo: [
    //   {
    //     chainId: mainnet.id,
    //     address: '0xF241d57C6DebAe225c0F2e6eA1529373C9A9C9fB',
    //     assetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    //     scope: 4916574638117198869413701114161172350986437430914933850166949084132905299523n,
    //     deploymentBlock: 22153707n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseEther('10000'),
    //     asset: 'ETH',
    //     assetDecimals: 18,
    //     icon: mainnetIcon.src,
    //     isStableAsset: false,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0x05e4DBD71B56861eeD2Aaa12d00A797F04B5D3c0',
    //     assetAddress: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
    //     scope: 10083421949316970946867916491567109470259179563818386567305777802830033294482n,
    //     deploymentBlock: 22917987n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('1000000', 18),
    //     asset: 'USDS',
    //     assetDecimals: 18,
    //     icon: usdsIcon.src,
    //     isStableAsset: true,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0xBBdA2173CDFEA1c3bD7F2908798F1265301d750c',
    //     assetAddress: '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD',
    //     scope: 2712591485699559808625639968151776585195565171751537345918418329806863214557n,
    //     deploymentBlock: 22941225n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('1000000', 18),
    //     asset: 'sUSDS',
    //     assetDecimals: 18,
    //     icon: susdsIcon.src,
    //     isStableAsset: true,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0x1c31C03B8CB2EE674D0F11De77135536db828257',
    //     assetAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    //     scope: 15036211945525489305347805074288289358577232744970551616130812771908439733411n,
    //     deploymentBlock: 22946646n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('1000000', 18),
    //     asset: 'DAI',
    //     assetDecimals: 18,
    //     icon: daiIcon.src,
    //     isStableAsset: true,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0xe859C0bD25f260BaEE534Fb52e307D3b64D24572',
    //     assetAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    //     scope: 15021418340692283880916004685565940332387258944710606800522765380598358159605n,
    //     deploymentBlock: 22988421n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('1000000', 6),
    //     asset: 'USDT',
    //     assetDecimals: 6,
    //     icon: usdtIcon.src,
    //     isStableAsset: true,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0xb419c2867aB3CBc78921660cB95150d95A94ce86',
    //     assetAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    //     scope: 16452108168275993030962142353354044100680963945240756716593099151407051066232n,
    //     deploymentBlock: 22988431n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('1000000', 6),
    //     asset: 'USDC',
    //     assetDecimals: 6,
    //     icon: usdcIcon.src,
    //     isStableAsset: true,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0x1A604E9DFa0EFDC7FFda378AF16Cb81243b61633',
    //     assetAddress: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    //     scope: 472674026048933344947929992064610492276304547390666782210980269768303717449n,
    //     deploymentBlock: 23039970n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('100000', 18),
    //     asset: 'wstETH',
    //     assetDecimals: 18,
    //     icon: wstethIcon.src,
    //     isStableAsset: false,
    //   },
    //   {
    //     chainId: mainnet.id,
    //     address: '0xF973f4B180A568157Cd7A0E6006449139E6Bfc32',
    //     assetAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    //     scope: 9583811136054309663087994285053104517603064138421869930481915957893514499997n,
    //     deploymentBlock: 23039980n,
    //     entryPointAddress: '0x6818809EefCe719E480a7526D76bD3e561526b46',
    //     maxDeposit: parseUnits('100', 8),
    //     asset: 'wBTC',
    //     assetDecimals: 8,
    //     icon: wbtcIcon.src,
    //     isStableAsset: false,
    //   },
    // ],
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
      {
        chainId: devnet.id.toString(),
        asset: 'ETH' as const,
        assetAddress: toAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'),
        assetDecimals: 18,
        address: toAddress('0x5f31bfa4bda4cac510ce3235b58f5595b6097e59f2bd554ff3bc19d779a90f'),
        scope: toAddress(0x5448b936fbc76a4d45a638d23b884cf31f2b1bede31e9fce22952c2424fc70n),
        entryPointAddress: toAddress('0x248be73ad9087517e4624c29ce4ac84a76c8b4791205baa6856970e32ef6794'),
        maxDeposit: parseEther('10'),
        deploymentBlock: 1446670n,
      },
    ],
  },
};

export const chainData = IS_TESTNET ? testnetChainData : mainnetChainData;
