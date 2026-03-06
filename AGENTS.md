# AGENTS.md — Patterns & Conventions for Mines Protocol

## Contract Patterns (AssemblyScript / OPNet)

### OP_20 Token Contract Skeleton
```typescript
import {
    Blockchain, BytesWriter, Calldata, OP20, OP20InitParameters,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

@final
export class MyToken extends OP20 {
    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);  // MUST be first
        const maxSupply: u256 = u256.fromString('1000000000000000000000000000');
        this.instantiate(new OP20InitParameters(maxSupply, 18, 'Name', 'SYM'));
    }

    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public myMethod(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(u256.fromU32(0));
        return response;
    }
}
```

### OP_NET Non-Token Contract Skeleton
```typescript
import {
    Blockchain, BytesWriter, BytesReader, Calldata, OP_NET, Revert,
    SafeMath, StoredU256, TransferHelper, Address,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

const ZERO: u256 = u256.fromU32(0);
const ONE: u256 = u256.fromU32(1);
const EMPTY_SUB: Uint8Array = new Uint8Array(30);

@final
export class MyContract extends OP_NET {
    private readonly _counter: StoredU256 = new StoredU256(Blockchain.nextPointer, EMPTY_SUB);
    private readonly pSomeField: u16 = Blockchain.nextPointer;

    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);
    }
}
```

### Index.ts Boilerplate (NEVER modify this pattern)
```typescript
import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { MyContract } from './MyContract';

Blockchain.contract = () => {
    return new MyContract();
};

export * from '@btc-vision/btc-runtime/runtime/exports';

export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
```

### Storage Key Helpers (from MultSigVault)
```typescript
// Simple field key: [ptr_hi, ptr_lo, 0...0]
@inline
private fieldKeySimple(ptr: u16): Uint8Array {
    const k = new Uint8Array(32);
    k[0] = u8((ptr >> 8) & 0xFF);
    k[1] = u8(ptr & 0xFF);
    return k;
}

// Compound key with ID: [ptr(2)] + [zeros(26)] + [id_lo32(4)]
@inline
private fieldKey(ptr: u16, id: u256): Uint8Array {
    const k = new Uint8Array(32);
    k[0] = u8((ptr >> 8) & 0xFF);
    k[1] = u8(ptr & 0xFF);
    const idVal: u32 = u32(id.lo1);
    k[28] = u8((idVal >> 24) & 0xFF);
    k[29] = u8((idVal >> 16) & 0xFF);
    k[30] = u8((idVal >> 8) & 0xFF);
    k[31] = u8(idVal & 0xFF);
    return k;
}

// Address-keyed field: [ptr(2)] + [addr bytes(30)]
@inline
private addrKey(ptr: u16, addr: Address): Uint8Array {
    const k = new Uint8Array(32);
    k[0] = u8((ptr >> 8) & 0xFF);
    k[1] = u8(ptr & 0xFF);
    for (let i: i32 = 0; i < 30; i++) {
        k[i + 2] = addr[i];
    }
    return k;
}

// Raw storage read/write
@inline private su(key: Uint8Array, val: u256): void {
    Blockchain.setStorageAt(key, val.toUint8Array(true));
}
@inline private lu(key: Uint8Array): u256 {
    return u256.fromUint8ArrayBE(Blockchain.getStorageAt(key));
}
@inline private sa(key: Uint8Array, addr: Address): void {
    const w = new BytesWriter(32);
    w.writeAddress(addr);
    Blockchain.setStorageAt(key, w.getBuffer());
}
@inline private la(key: Uint8Array): Address {
    return new BytesReader(Blockchain.getStorageAt(key)).readAddress();
}
```

### SafeMath Rules
- ALL u256 arithmetic MUST use SafeMath: `SafeMath.add()`, `SafeMath.sub()`, `SafeMath.mul()`, `SafeMath.div()`
- NEVER use raw `+`, `-`, `*`, `/` on u256 values
- For big number literals: `u256.fromString('123...')` not `u256.fromU64()` (overflow risk)
- For small constants: `u256.fromU32(100)` is fine

### Access Control Pattern
```typescript
private requireOwner(): void {
    const owner = this.la(this.fieldKeySimple(this._owner));
    if (Blockchain.tx.sender != owner) throw new Revert('not owner');
}
```

### CEI Pattern (Checks-Effects-Interactions)
```typescript
// 1. CHECKS — validate inputs
if (amount == ZERO) throw new Revert('zero amount');

// 2. EFFECTS — update local state
this.su(balKey, SafeMath.sub(bal, amount));

// 3. INTERACTIONS — external calls
TransferHelper.transfer(token, to, amount);
```

## Frontend Patterns

### Identity Key Resolution (CRITICAL)
```typescript
const opnetNet = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const script = toOutputScript(walletAddress, opnetNet);
const tweakedHex = '0x' + Array.from(script.subarray(2))
    .map(b => b.toString(16).padStart(2, '0')).join('');
const pubKeyInfo = await provider.getPublicKeyInfo(tweakedHex, false);
const identityHex = pubKeyInfo?.toString();
const compressedTweaked = '0x02' + tweakedHex.slice(2);
const sender = Address.fromString(identityHex, compressedTweaked);
```

### getContract Usage
```typescript
// Read-only (no sender needed):
const contract = getContract(addr, ABI, provider, networks.testnet);

// Write operations (sender required as 5th param):
const contract = getContract(addr, ABI, provider, networks.testnet, senderAddress);
```

### sendTransaction (Frontend)
```typescript
await sim.sendTransaction({
    signer: null,           // ALWAYS null on frontend
    mldsaSigner: null,      // ALWAYS null on frontend
    refundTo: walletAddress,
    maximumAllowedSatToSpend: BigInt(100_000),
    feeRate: 10,
    network: networks.testnet,
    minGas: BigInt(100_000),
});
```

### Reading Token Balances
```typescript
const balRes = await contract.balanceOf(ownerAddress);
const raw = balRes?.properties?.balance
    ?? balRes?.result
    ?? balRes?.decoded?.[0]
    ?? null;
const balance = raw !== null ? BigInt(raw.toString()) : BigInt(0);
```

### Import Rules (Frontend)
```typescript
// CORRECT imports:
import { Address } from '@btc-vision/transaction';
import { getContract, JSONRpcProvider, OP_20_ABI } from 'opnet';
import { networks, toOutputScript } from '@btc-vision/bitcoin';

// NEVER import Address or ABIDataTypes from @btc-vision/bitcoin on frontend
```

## Build & Deploy

### Contract Build
```bash
asc src/contract-name/index.ts --target targetname --measure --uncheckedBehavior never
```

### asconfig.json Target Pattern
```json
{
  "targetname": {
    "outFile": "build/ContractName.wasm",
    "textFile": "build/ContractName.wat",
    "use": ["abort=src/contract-name/index/abort"]
  }
}
```

## Naming Conventions
- Contract classes: PascalCase (`MinerToken`, `MultSigVault`)
- Storage pointers: `_camelCase` for simple, `pCamelCase` for mapping pointers
- Methods: camelCase (`wrap`, `unwrap`, `getRewards`)
- Constants: UPPER_SNAKE_CASE (`MAX_DEPOSIT_WITHDRAW_FEE`, `POINT_MULTIPLIER`)
- Files: PascalCase for contract files, camelCase for frontend

### Cross-Contract Call Pattern
```typescript
import { encodeSelector, Selector } from '@btc-vision/btc-runtime/runtime';

// Static selector (computed once)
private static readonly MY_SELECTOR: Selector = encodeSelector('methodName');

// Build calldata: selector + params
const cd = new BytesWriter(4 + 32); // 4 bytes selector + param sizes
cd.writeSelector(MyContract.MY_SELECTOR);
cd.writeAddress(someAddress);

// Call target contract — reverts on failure by default
const result = Blockchain.call(targetContract, cd);

// Parse return value
const returnVal: u256 = result.data.readU256();
```

### Contract Interaction Script Pattern (signInteraction)
```typescript
import { createHash } from 'node:crypto';
import { TransactionFactory, BinaryWriter, Address } from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';

// SHA256 selector
function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

// Get contract pubkey via RPC
const code = await rpcProvider.getCode(contractBech32Addr);
const contractPubkey = (code as any).contractPublicKey;
const pubkeyHex = contractPubkey instanceof Uint8Array
    ? '0x' + Buffer.from(contractPubkey).toString('hex')
    : contractPubkey.toString();

// Build calldata
const writer = new BinaryWriter();
writer.writeSelector(sel('methodName'));
writer.writeAddress(Address.fromString(addr32ByteHex));
const calldata = new Uint8Array(writer.getBuffer());

// Sign & broadcast
const factory = new TransactionFactory();
const result = await factory.signInteraction({
    to: contractBech32Addr,
    from: p2tr!,
    contract: pubkeyHex,
    calldata,
    challenge,
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    network: NETWORK,
    utxos,
    feeRate: 50,
    priorityFee: 0n,
    gasSatFee: 10_000n,
});
// Broadcast funding tx first, then interaction tx
```

## Common Gotchas
1. `super.onDeployment(_calldata)` MUST be the first line in onDeployment
2. `StoredU256` second param is `Uint8Array(30)`, NOT `u256.Zero`
3. ABIDataTypes is globally available via decorators, NOT importable
4. Method selectors are SHA256 (not Keccak256)
5. Constructor runs EVERY interaction — init logic goes in onDeployment only
6. OP_20 uses `increaseAllowance()`/`decreaseAllowance()`, NOT `approve()`
7. Frontend: identity key ≠ tweaked pubkey — use identity for ALL contract calls
8. Frontend: `maximumAllowedSatToSpend` + `minGas` must be < wallet balance
9. `OP20.totalSupply(_: Calldata)` is a public @method returning BytesWriter — for internal u256 access use `this._totalSupply.value` instead
10. `Address` extends `Uint8Array` — there is NO `.toBytes()` method. Index directly into the Address (e.g., `addr[i]`) for byte access in key builders

## Genome Contract Patterns

### Genome class (extends OP20)
```typescript
// Genome.ts — gToken yield-wrapping contract
@final
export class Genome extends OP20 {
    // ... same storage pointer pattern as Mine.ts
}
```

### gToken Naming Rules
- All genome token symbols **MUST** start with lowercase `g` (e.g. `gMOTO`, `gPILL`)
- Validated in CreateGenomePage.tsx: symbol onChange shows error, onBlur auto-prepends `g`
- underlyingSymbol derived by stripping `g` prefix: `gMOTO` → `MOTO`

### injectRewards Method Signature
```typescript
@method()
@returns({ name: 'amount', type: ABIDataTypes.UINT256 })
public injectRewards(_calldata: Calldata): BytesWriter {
    this.requireOwner();
    const amount: u256 = _calldata.readU256();
    if (amount == ZERO) throw new Revert('zero amount');
    // EFFECTS: increment _underlyingHeld
    const heldKey = this.fieldKeySimple(this._underlyingHeld);
    this.su(heldKey, SafeMath.add(this.lu(heldKey), amount));
    // INTERACTIONS: pull underlying from caller
    const underlying: Address = this.la(this.fieldKeySimple(this._underlying));
    TransferHelper.transferFrom(underlying, Blockchain.tx.sender, Blockchain.contractAddress, amount);
    const response = new BytesWriter(32);
    response.writeU256(amount);
    return response;
}
```

## MotoSwap Pool Interaction Patterns

### useGenomePoolInfo Hook
```typescript
import { useGenomePoolInfo } from '../hooks/useGenomePoolInfo';

const { poolAddress, reserve0, reserve1, lpBalance, loading, error } =
    useGenomePoolInfo(genomeAddress, genomePubkey, underlyingPubkey, senderAddress);
```

### getPool / createPool / getReserves
```typescript
import { MotoSwapFactoryAbi, MotoswapPoolAbi, type IMotoswapFactoryContract } from 'opnet';
import { Address } from '@btc-vision/transaction';

// Read pool address (no sender needed)
const factory = getContract<IMotoswapFactoryContract>(
    CONTRACT_ADDRESSES.motoswapFactory, MotoSwapFactoryAbi as any, provider, NETWORK
);
const poolResult = await factory.getPool(
    Address.fromString(genomePubkey),
    Address.fromString(underlyingPubkey)
);

// Create pool (sender required)
const factoryWrite = getContract<IMotoswapFactoryContract>(
    CONTRACT_ADDRESSES.motoswapFactory, MotoSwapFactoryAbi as any, provider, NETWORK, senderAddress
);
const poolSim = await factoryWrite.createPool(
    Address.fromString(genomePubkey),
    Address.fromString(underlyingPubkey)
);
await poolSim.sendTransaction({ /* signer/mldsaSigner omitted */ refundTo: walletAddress, ... });

// Get reserves (no sender)
const poolContract = getContract(poolAddress, MotoswapPoolAbi as any, provider, NETWORK);
const reservesResult = await poolContract.getReserves();
```

### Address.fromString — single-arg pattern (contract addresses)
```typescript
// For contract pubkeys stored as 0x-prefixed hex, use ONE argument:
Address.fromString(pubkeyHex)
// Two-arg form is only for wallet identity keys (identity + tweaked pubkey pair):
Address.fromString(identityHex, compressedTweakedHex)
```

## LP Claim Flow (5-step sequence)

Full flow to remove LP tokens and inject underlying rewards into a Genome:

```typescript
// Step 1 — Get pool address
const pool = await motoFactory.getPool(gTokenAddr, underlyingAddr);

// Step 2 — Get LP balance (already in useGenomePoolInfo)
const lpBalance = ...; // bigint from OP_20 balanceOf on pool address

// Step 3 — Approve LP tokens to router
const lpContract = getContract(poolAddress, MotoswapPoolAbi as any, provider, NETWORK, senderAddress);
const approveSim = await lpContract.increaseAllowance(
    Address.fromString(CONTRACT_ADDRESSES.motoswapRouter), lpBalance
);
await approveSim.sendTransaction({ refundTo: walletAddress, ... });

// Step 4 — Remove liquidity (returns underlying amount)
const router = getContract(CONTRACT_ADDRESSES.motoswapRouter, MOTOSWAP_ROUTER_ABI as any, provider, NETWORK, senderAddress);
const removeSim = await router.removeLiquidity(
    gTokenAddress, underlyingAddress, lpBalance,
    0n, 0n, walletSenderAddress,
    BigInt(Math.floor(Date.now() / 1000) + 1200)  // deadline: now + 20min
);
await removeSim.sendTransaction({ refundTo: walletAddress, ... });
// Extract underlyingAmount from result (the amount of underlying token returned)

// Step 5 — Inject underlying into Genome
const underlyingContract = getContract(underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
await (await underlyingContract.increaseAllowance(Address.fromString(genomePubkey), underlyingAmount))
    .sendTransaction({ refundTo: walletAddress, ... });
const genomeContract = getContract(genomeAddress, GENOME_ABI as any, provider, NETWORK, senderAddress);
await (await genomeContract.injectRewards(underlyingAmount))
    .sendTransaction({ refundTo: walletAddress, ... });
// Genome ratio increases — all existing xToken holders earn yield
```

### signInteraction — omit signer/mldsaSigner entirely (frontend)
```typescript
// CORRECT: omit signer and mldsaSigner keys entirely
await sim.sendTransaction({
    refundTo: walletAddress,
    maximumAllowedSatToSpend: BigInt(100_000),
    feeRate: 10,
    network: NETWORK,
    minGas: BigInt(100_000),
});
// WRONG: signer: null, mldsaSigner: null → OPWallet rejects
```
