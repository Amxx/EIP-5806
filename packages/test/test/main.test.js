const { ethers } = require('hardhat');
const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('Mock', function () {
  before(async function () {
    this.mock             = await ethers.deployContract('Mock');
    this.signer           = ethers.Wallet.createRandom(ethers.provider);
    this.signerAsInstance = this.mock.attach(this.signer.address);
    await ethers.getSigners().then(([ account ]) => account.sendTransaction({ to: this.signer.address, value: ethers.WeiPerEther }));
  });

  beforeEach(async function () {
    this.instance = await this.mock.create()
      .then(tx => tx.wait())
      .then(receipt => receipt.logs.find(ev => ev.fragment.name === 'NewClone').args.instance)
      .then(address => this.mock.attach(address).connect(this.signer));
  });

  it('events', async function () {
    await expect(this.instance.log.send({ value: 1n }))
      .to.emit(this.instance, 'Context')
      .withArgs(this.instance, this.signer, 1n, 1n);

    await expect(this.instance.log.delegateCall())
      .to.emit(this.signerAsInstance, 'Context')
      .withArgs(this.signer, this.signer, 0n, anyValue);
  });

  it('call', async function () {
    const target = ethers.Wallet.createRandom();
    await expect(this.instance.call.delegateCall(target, 100n, '0x', { gasLimit: 100000n })) // gas?
    .to.changeEtherBalances([ this.signer, target, this.instance], [ -100n, 100n, 0n ]);
  });

  describe('restricted opcodes', function () {
    it('sstore', async function () {
      expect(await ethers.provider.getStorage(this.instance, 0)).to.equal(ethers.ZeroHash);
      expect(await ethers.provider.getStorage(this.signer, 0)).to.equal(ethers.ZeroHash);

      await expect(this.instance.increment.send())
        .to.not.be.reverted;

      expect(await ethers.provider.getStorage(this.instance, 0)).to.not.equal(ethers.ZeroHash);
      expect(await ethers.provider.getStorage(this.signer, 0)).to.equal(ethers.ZeroHash);

      await expect(this.instance.increment.delegateCall())
        .to.be.reverted;

      expect(await ethers.provider.getStorage(this.instance, 0)).to.not.equal(ethers.ZeroHash);
      expect(await ethers.provider.getStorage(this.signer, 0)).to.equal(ethers.ZeroHash);
    });

    it('create', async function () {
      await expect(this.instance.create.delegateCall())
        .to.be.reverted;
      await expect(this.instance.delegatecall.delegateCall(this.instance, this.instance.interface.encodeFunctionData('create()')))
        .to.be.reverted;
      await expect(this.instance.call.delegateCall(this.instance, 0, this.instance.interface.encodeFunctionData('create()')))
        .to.not.be.reverted;
    });

    it('create2', async function () {
      const salt = ethers.randomBytes(32);
      await expect(this.instance.create2.delegateCall(salt))
        .to.be.reverted;
      await expect(this.instance.delegatecall.delegateCall(this.instance, this.instance.interface.encodeFunctionData('create2(bytes32)', [ salt ])))
        .to.be.reverted;
      await expect(this.instance.call.delegateCall(this.instance, 0, this.instance.interface.encodeFunctionData('create2(bytes32)', [ salt ])))
        .to.not.be.reverted;
    });

    it('selfdestruct', async function () {
      await expect(this.instance.destroy.delegateCall())
        .to.be.reverted;
      await expect(this.instance.delegatecall.delegateCall(this.instance, this.instance.interface.encodeFunctionData('destroy()')))
        .to.be.reverted;
      await expect(this.instance.call.delegateCall(this.instance, 0, this.instance.interface.encodeFunctionData('destroy()')))
        .to.not.be.reverted;
    });
  });
});