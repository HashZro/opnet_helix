import { networks } from '@btc-vision/bitcoin';
import { Address, BinaryWriter } from '@btc-vision/transaction';
import { createHash } from 'node:crypto';

// Test Address.fromString with single param (pubkey hex)
const MOTO_UNDERLYING = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const MOTO_MINE      = '0x170bc1d3b2a07d0ec8dc37a7d31efebefd619dafc9609fc0cb806220e4869ae7';

try {
    const addr1 = Address.fromString(MOTO_UNDERLYING);
    console.log('Address.fromString(UNDERLYING) works:', addr1.toString());
} catch (e) {
    console.error('Address.fromString(UNDERLYING) failed:', (e as Error).message);
}

// Check what the selector computes to
function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

const selector = sel('registerMine');
console.log('\nregisterMine selector (uint32):', selector);
console.log('registerMine selector (hex):', selector.toString(16).padStart(8, '0'));

// Check what the full calldata looks like
const writer = new BinaryWriter();
writer.writeSelector(selector);
writer.writeAddress(Address.fromString(MOTO_UNDERLYING));
writer.writeAddress(Address.fromString(MOTO_MINE));
const calldata = new Uint8Array(writer.getBuffer());
console.log('\nCalldata hex:', Buffer.from(calldata).toString('hex'));
console.log('Calldata length:', calldata.length, 'bytes');
