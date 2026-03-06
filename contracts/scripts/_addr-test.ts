import { createHash } from 'node:crypto';
import { fromBech32, toBech32 } from '@btc-vision/bitcoin';

function hash160(buf: Buffer): Buffer {
    const sha256 = createHash('sha256').update(buf).digest();
    return createHash('ripemd160').update(sha256).digest() as unknown as Buffer;
}
function pubkeyToBech32(pubkeyHex: string, prefix = 'opt', version = 16): string {
    const pubBytes = Buffer.from(pubkeyHex.replace('0x', ''), 'hex');
    const h = hash160(pubBytes);
    const data = Buffer.concat([Buffer.from([0x00]), h]);
    return toBech32(data, version, prefix);
}

// Verify: MOTO pubkey -> known bech32
const motoBech32 = pubkeyToBech32('fd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd');
console.log('MOTO bech32 computed:', motoBech32);
console.log('MOTO bech32 expected: opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds');
console.log('Match:', motoBech32 === 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds');

// Genome
const genomeBech32 = pubkeyToBech32('8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898');
console.log('\nGenome bech32:', genomeBech32);
