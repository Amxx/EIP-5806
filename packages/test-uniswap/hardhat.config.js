const { argv } = require('yargs/yargs')()
  .env('')
  .options({});

require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-ethers');
require('./hardhat/remappings');

module.exports = {
  solidity: {
    version: '0.8.25',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun',
    },
  },
  networks: {
    hardhat: {
      hardfork: 'cancun',
      eips: [5806],
    },
  },
};
