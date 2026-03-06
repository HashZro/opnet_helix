# Factory Contract Methods

The Helix Factory is the registry contract that maps underlying OP-20 tokens to their Genome contracts. It is the source of truth for all registered Genomes displayed on the Explore page.

## Testnet Deployment

| Field | Value |
|---|---|
| **Address (bech32)** | `opt1sqr560qfrd9czkhtagkslclxaej2qxnryjvzjlws8` |
| **Address (pubkey)** | `0x33d3202c0f340a7f3b743af576be7680e4dc742500c203f933e34fcd1d42f738` |
| **Network** | OPNet testnet |
| **OPScan** | [View on OPScan](https://opscan.org/contracts/0x33d3202c0f340a7f3b743af576be7680e4dc742500c203f933e34fcd1d42f738?network=op_testnet) |

## Method Reference

| Method | Parameters | Returns | Who Can Call | Description |
|---|---|---|---|---|
| `registerGenome` | `underlying: Address, genome: Address` | `bool` | Anyone (called by deployer) | Registers a Genome contract for an underlying token. Reverts if a Genome already exists for this underlying. |
| `getGenomeAddress` | `underlying: Address` | `Address` | Anyone | Returns the Genome contract address for a given underlying token. Returns zero address if no Genome exists. |
| `getGenomeCount` | — | `u256` | Anyone | Returns the total number of registered Genomes. |
| `getGenomeAtIndex` | `index: u256` | `Address` | Anyone | Returns the underlying token address at the given index (0-based). Use with `getGenomeCount` to enumerate all Genomes. |

## Enumerating All Genomes

The Helix frontend fetches all registered Genomes using a pagination pattern:

```typescript
const count = await factory.getGenomeCount();
for (let i = 0; i < count; i++) {
    const underlyingAddress = await factory.getGenomeAtIndex(i);
    const genomeAddress = await factory.getGenomeAddress(underlyingAddress);
    // load genome details...
}
```

This pattern is used by the Explore page to build the genome card list on load.

## One Genome Per Underlying

The Factory enforces a strict 1:1 mapping: each underlying token can have at most one registered Genome. If you attempt to register a second Genome for the same underlying, the transaction will revert with a "Genome already registered" error.
