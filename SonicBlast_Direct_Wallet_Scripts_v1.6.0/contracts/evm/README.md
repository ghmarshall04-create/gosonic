# SonicBlast fixed-supply token contract

`SonicBlastToken.sol` is a small fixed-supply ERC-20. The constructor assigns the entire supply to the public owner address. It contains no owner role, no post-deployment mint function, no transfer tax, no blacklist, and no liquidity lock.

Build it with:

```bash
cd contracts/evm
forge build
```

A separate smart-contract review is appropriate before a mainnet launch. The runner is a deployment tool; it does not substitute for that review.
