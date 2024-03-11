# EIP-5806

:warning: :hammer_and_wrench: This page is work in progress. Please feel free to contribute through the issues.

## What is EIP-5806?

> EIP-5806 is an EIP adds a new transaction type that allows EOAs to execute arbitrary code using a delegate-call-like mechanism.

### Usefull links:

- [EIP document](https://eips.ethereum.org/EIPS/eip-5806)
- [Discussion](https://ethereum-magicians.org/t/eip-5806-delegate-transaction/11409)

## Implementations effort

### Clients

- [go-ethereum](https://github.com/ethereum/go-ethereum/pull/28997)
- [ethereumjs](https://github.com/ethereumjs/ethereumjs-monorepo/pull/3312)

### Tooling

- [ethers.js](https://github.com/ethers-io/ethers.js/pull/4638)

### Wallets

*waiting for contributions*


## Knowledge

### How to make EIP-5806 available in hardhat

These changes are not "clean" but they provide some guidance to get a minimal example (that is enough to pass the tests in `packages/test`).

- Use `hardhat:2.20.1` (Later version use EDR)
- Use `@nomicfoundation/ethereumjs-xxx` from [this branch](https://github.com/Amxx/ethereumjs-monorepo/tree/features/eip-5806-nomiclabs)
- Configure `networks.hardhat.hardfork = 'cancun'` in your `hardhat.config.json`
- Modify `node_modules/hardhat/internal/hardhat-network/provider/modules/eth.js`
```diff
-if (rawTx[0] <= 0x7f && rawTx[0] !== 1 && rawTx[0] !== 2) {
+if (rawTx[0] <= 0x7f && rawTx[0] !== 1 && rawTx[0] !== 2 && rawTx[0] !== 4) {
```
  - ideally, you'd also add
```javascript
const EIP5806_MIN_HARDFORK = hardforks_1.HardforkName.CANCUN;
// ...
if (rawTx[0] === 4 && !this._common.gteHardfork(EIP5806_MIN_HARDFORK)) {
    throw new errors_1.InvalidArgumentsError(`Trying to send an EIP-5806 transaction but they are not supported by the current hard fork. You can use them by running Hardhat Network with 'hardfork' ${EIP5806_MIN_HARDFORK} or later.`);
}
```
- Modify `node_modules/hardhat/internal/hardhat-network/provider/utils/makeCommon.js`
```diff
hardfork: hardfork === hardforks_1.HardforkName.MERGE ? "mergeForkIdTransition" : hardfork,
+eips: [ 5806 ],
```
