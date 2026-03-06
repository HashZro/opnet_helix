// Factory v3 — Genome Protocol deployed 2026-03-05
import { networks } from '@btc-vision/bitcoin';

export const GENOME_CONTRACT_VERSION = 2;

// Genomes to permanently hide from the Explore page (use the full pubkey hex, e.g. "0x13e7c4...")
export const HIDDEN_GENOME_PUBKEYS: string[] = [];

export const NETWORK = networks.testnet;
export const RPC_URL = 'https://testnet.opnet.org';

export const CONTRACT_ADDRESSES = {
    // Factory v3 — Genome Protocol, deployed 2026-03-05
    factory: 'opt1sqpfg7r4n6jqen30xqtm5fak5gllpczhd3syzafv8',
    factoryPubkey: '0x37df83dfbcca6447316f9e43a10009f81fc37171a9ad7d40d98a090b6806f67b',
    motoToken: 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds',
    motoTokenPubkey: '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd',
    pillToken: 'opt1sqp5gx9k0nrqph3sy3aeyzt673dz7ygtqxcfdqfle',
    motoswapRouter: '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a',
    motoswapFactory: '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f',
};
