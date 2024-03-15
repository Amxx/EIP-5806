# EIP-5806

:warning: :hammer_and_wrench: This page is work in progress. Please feel free to contribute through the issues.

## What is EIP-5806?

> EIP-5806 is an EIP adds a new transaction type that allows EOAs to execute arbitrary code using a delegate-call-like mechanism.

### Usefull links:

- [EIP document](https://eips.ethereum.org/EIPS/eip-5806)
- [Discussion](https://ethereum-magicians.org/t/eip-5806-delegate-transaction/11409)

## Implementations effort

### Clients / EVM implementations

- [go-ethereum](https://github.com/ethereum/go-ethereum/pull/28997): Prototype working + initially tested. Missing formal tests and review.
- [ethereumjs](https://github.com/ethereumjs/ethereumjs-monorepo/pull/3312): Prototype working + initially tested. Missing formal tests and review.
- [hardhat (edr)](https://github.com/Amxx/hardhat/tree/features/eip-5806): Work in progress. Not tested. Blocked by revm. (needs to be updated to support revm 7.1 based forks)
- [revm](https://github.com/bluealloy/revm/pull/1184): Work in progress. Not tested. (Based on 7.1)

### Tooling

- [ethers.js](https://github.com/ethers-io/ethers.js/pull/4638): Prototype working + initially tested. Missing formal tests and review. Used for testing clients.

### Wallets

*waiting for contributions*


## Knowledge

### How to make EIP-5806 available in hardhat

```bash
npm install 'https://gitpkg.now.sh/Amxx/hardhat/packages/hardhat-core?features/eip5806/2.20.2'
```
or
```bash
yarn add 'https://gitpkg.now.sh/Amxx/hardhat/packages/hardhat-core?features/eip5806/2.20.2'
```
- Configure `networks.hardhat.hardfork = 'cancun'` and `networks.hardhat.eips = [5806]` in your `hardhat.config.json`
