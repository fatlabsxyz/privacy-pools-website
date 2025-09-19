export type ValidAddress = `0x${string}` & {
  _kind: 'address';
};
