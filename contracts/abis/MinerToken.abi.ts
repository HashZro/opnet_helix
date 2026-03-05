import { OP_NET_ABI } from 'opnet';

export const MinerTokenEvents = [];

export const MinerTokenAbi = [
    ...MinerTokenEvents,
    ...OP_NET_ABI,
];

export default MinerTokenAbi;
