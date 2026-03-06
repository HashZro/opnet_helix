// Factory v5 — Genome Protocol redeployed 2026-03-06
import { networks } from '@btc-vision/bitcoin';

export const GENOME_CONTRACT_VERSION = 2;

// Genomes to permanently hide from the Explore page (use the full pubkey hex, e.g. "0x13e7c4...")
export const HIDDEN_GENOME_PUBKEYS: string[] = [];

export const NETWORK = networks.testnet;
export const RPC_URL = 'https://testnet.opnet.org';

export const CONTRACT_ADDRESSES = {
    // Factory v5 — Genome Protocol, redeployed 2026-03-06
    factory: 'opt1sqr560qfrd9czkhtagkslclxaej2qxnryjvzjlws8',
    factoryPubkey: '0x33d3202c0f340a7f3b743af576be7680e4dc742500c203f933e34fcd1d42f738',
    motoToken: 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds',
    motoTokenPubkey: '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd',
    pillToken: 'opt1sqp5gx9k0nrqph3sy3aeyzt673dz7ygtqxcfdqfle',
    motoswapRouter: '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a',
    motoswapFactory: '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f',
};
