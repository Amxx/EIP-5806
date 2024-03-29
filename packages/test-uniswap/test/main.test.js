const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, setCode } = require('@nomicfoundation/hardhat-network-helpers');

// helpers and constants
const Hooks = {
  BEFORE_INITIALIZE_FLAG: 1n << 159n,
  AFTER_INITIALIZE_FLAG: 1n << 158n,
  BEFORE_ADD_LIQUIDITY_FLAG: 1n << 157n,
  AFTER_ADD_LIQUIDITY_FLAG: 1n << 156n,
  BEFORE_REMOVE_LIQUIDITY_FLAG: 1n << 155n,
  AFTER_REMOVE_LIQUIDITY_FLAG: 1n << 154n,
  BEFORE_SWAP_FLAG: 1n << 153n,
  AFTER_SWAP_FLAG: 1n << 152n,
  BEFORE_DONATE_FLAG: 1n << 151n,
  AFTER_DONATE_FLAG: 1n << 150n,
  NO_OP_FLAG: 1n << 149n,
  ACCESS_LOCK_FLAG: 1n << 148n,
};
const Constants = {
  MAX_DEADLINE: 12329839823n,
  SQRT_RATIO_1_1: 79228162514264337593543950336n,
  SQRT_RATIO_1_2: 56022770974786139918731938227n,
  TICK_SPACING: 60n,
  ZERO_BYTES: '0x',
};

// fixture
async function fixture() {
  const [ admin, user ] = await ethers.getSigners();

  // deployFreshManagerAndRouters
  const manager = await ethers.deployContract('PoolManager', [ 500000 ])
  const feeController = await ethers.deployContract('ProtocolFeeControllerTest');
  const router = await ethers.deployContract('HookEnabledSwapRouter', [manager]);

  // Hook
  let fullRange;

  try {
    // Cheat to deploy hook
    const fullRangeAddr = ethers.getAddress((Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG).toString(16));
    const fullRangeImpl = await ethers.deployContract('FullRangeImplementation', [manager, fullRangeAddr]);
    fullRange = fullRangeImpl.attach(fullRangeAddr);
    await ethers.provider.getCode(fullRangeImpl).then(code => setCode(fullRange.target, code));
  } catch {
    const create2Factory = await ethers.deployContract('Factory');
    const fullRangeFactory = await ethers.getContractFactory('FullRange');
    const { data: bytecode } = await fullRangeFactory.getDeployTransaction(manager);
    console.log('start mining hook salt ...');
    const prefix = ethers.getAddress((Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG).toString(16)).slice(0, 5).toLowerCase();
    for (;;) {
      const salt = ethers.randomBytes(32);
      let addr = await create2Factory.computeAddress(salt, bytecode);
      if (addr.toLowerCase().startsWith(prefix)) {
        console.log('... salt found, deploying ...')
        await create2Factory.deploy(salt, bytecode)
        fullRange = fullRangeFactory.attach(addr);
        break;
      }
    }
    console.log('...done');
  }

  // tokens
  const createPoolKey = (token1, token2) => {
    const [currency0, currency1] = [ token1, token2 ].sort((a, b) => a.target - b.target);
    return { currency0, currency1, fee: 3000n, tickSpacing: Constants.TICK_SPACING, hooks: fullRange };
  }

  const token0 = await ethers.deployContract('ERC20Mock', ["Token #0", "T0"]);
  const token1 = await ethers.deployContract('ERC20Mock', ["Token #1", "T1"]);
  const token2 = await ethers.deployContract('ERC20Mock', ["Token #2", "T2"]);
  const key1 = createPoolKey(token0, token1);
  const key2 = createPoolKey(token1, token2);

  // Helpers
  const batchcall = await ethers.deployContract('BatchCall');

  // configure
  await Promise.all([].concat(
    manager.setProtocolFeeController(feeController),
    [token0, token1, token2].flatMap(token => [
      token.mint(admin, 2n**128n),
      token.connect(admin).approve(router, ethers.MaxUint256),
      token.connect(admin).approve(fullRange, ethers.MaxUint256),
    ]),
    [key1, key2].flatMap(key => [
      manager.initialize(key, Constants.SQRT_RATIO_1_1, Constants.ZERO_BYTES),
      fullRange.addLiquidity({
        currency0:      key.currency0,
        currency1:      key.currency1,
        fee:            key.fee,
        amount0Desired: ethers.parseEther('100'),
        amount1Desired: ethers.parseEther('100'),
        amount0Min:     ethers.parseEther('99'),
        amount1Min:     ethers.parseEther('99'),
        to:             admin,
        deadline:       Constants.MAX_DEADLINE,
      })
    ]),
  ));

  return {
    admin,
    user,
    batchcall,
    manager,
    feeController,
    router,
    fullRange,
    token0,
    token1,
    token2,
    key1,
    key2,
  };
};

// test
describe('Uniswap V4', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('swap', function () {
    const amountSpecified = 10000000n;
    const amountReceived = 9969999n;

    beforeEach(async function () {
      // mint tokens
      await this.key1.currency0.mint(this.user, amountSpecified);
      // check values before
      expect(await this.key1.currency0.balanceOf(this.user)).to.equal(amountSpecified);
      expect(await this.key1.currency1.balanceOf(this.user)).to.equal(0n);
      expect(await this.key1.currency0.allowance(this.user, this.router)).to.equal(0n);
      // prepare struct for measuring gas
      this.txs = [];

      // DEBUG
      // console.log({
      //   [this.key1.currency0.target]: 'this.key1.currency0',
      //   [this.user.address]: 'user',
      //   [this.router.target]: 'router',
      // });
    });

    afterEach(async function () {
      // check events
      await expect(this.txs.at(-1)).to.changeTokenBalances(this.key1.currency0, [this.manager, this.user], [amountSpecified, -amountSpecified]);
      await expect(this.txs.at(-1)).to.changeTokenBalances(this.key1.currency1, [this.manager, this.user], [-amountReceived, amountReceived]);
      // check values after
      expect(await this.key1.currency0.balanceOf(this.user)).to.equal(0n);
      expect(await this.key1.currency1.balanceOf(this.user)).to.equal(amountReceived);
      expect(await this.key1.currency0.allowance(this.user, this.router)).to.equal(0n);
      // measure used gas
      await Promise.all(this.txs.map(tx => tx.wait()))
        .then(receipts => receipts.reduce((acc, { gasUsed }) => acc + gasUsed, 0n))
        .then(gasUsed => console.log(`total: ${gasUsed}`));
    });

    it('approve and swap', async function () {
      await this.key1.currency0.connect(this.user).approve(this.router, amountSpecified).then(tx => this.txs.push(tx));
      await this.router.connect(this.user).swap(
        this.key1,
        { zeroForOne: true, amountSpecified: -amountSpecified, sqrtPriceLimitX96: Constants.SQRT_RATIO_1_2 },
        { withdrawTokens: true, settleUsingTransfer: true },
        Constants.ZERO_BYTES
      ).then(tx => this.txs.push(tx));
    });

    it('multicall - storage allowance', async function () {
      const calls = [{
        target: this.key1.currency0.target,
        value: 0n,
        data: this.key1.currency0.interface.encodeFunctionData('approve', [this.router.target, amountSpecified]),
      },{
        target: this.router.target,
        value: 0n,
        data: this.router.interface.encodeFunctionData('swap', [
          {
            currency0: this.key1.currency0.target,
            currency1: this.key1.currency1.target,
            fee: this.key1.fee,
            tickSpacing: this.key1.tickSpacing,
            hooks: this.key1.hooks.target,
          },
          {
            zeroForOne: true,
            amountSpecified: -amountSpecified,
            sqrtPriceLimitX96: Constants.SQRT_RATIO_1_2
          },
          {
            withdrawTokens: true,
            settleUsingTransfer: true
          },
          Constants.ZERO_BYTES
        ]),
      }];
      await this.batchcall.connect(this.user).exec.delegateCall(calls).then(tx => this.txs.push(tx));
    });

    it('multicall - transient allowance', async function () {
      const calls = [{
        target: this.key1.currency0.target,
        value: 0n,
        data: this.key1.currency0.interface.encodeFunctionData('temporaryApproval', [this.router.target, ethers.MaxUint256]), // allowance is revoked anyway
      },{
        target: this.router.target,
        value: 0n,
        data: this.router.interface.encodeFunctionData('swap', [
          {
            currency0: this.key1.currency0.target,
            currency1: this.key1.currency1.target,
            fee: this.key1.fee,
            tickSpacing: this.key1.tickSpacing,
            hooks: this.key1.hooks.target,
          },
          {
            zeroForOne: true,
            amountSpecified: -amountSpecified,
            sqrtPriceLimitX96: Constants.SQRT_RATIO_1_2
          },
          {
            withdrawTokens: true,
            settleUsingTransfer: true
          },
          Constants.ZERO_BYTES
        ]),
      }];
      await this.batchcall.connect(this.user).exec.delegateCall(calls).then(tx => this.txs.push(tx));
    });
  });
});
