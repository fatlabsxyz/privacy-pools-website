export const formatUnits = (value: bigint, decimals: number): string => (value / 10n ** BigInt(decimals)).toString();

export const parseUnits = (value: string | number, decimals: number): bigint => BigInt(value) * 10n ** BigInt(decimals);

export const parseEther = (ether: string | number) => parseUnits(ether, 18);
