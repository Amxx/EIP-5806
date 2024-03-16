const { ethers } = require('hardhat');
const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('Mock', function () {
  before(async function () {
    this.mock             = await ethers.deployContract('Mock');
    this.batch            = await ethers.deployContract('BatchCall');
    [this.signer]         = await ethers.getSigners();
    this.signerAsInstance = this.mock.attach(this.signer.address);
  });

  beforeEach(async function () {
    this.instance = await this.mock.create()
      .then(tx => tx.wait())
      .then(receipt => receipt.logs.find(ev => ev.fragment.name === 'NewClone').args.instance)
      .then(address => this.mock.attach(address));
  });

  it('using ethers signer', async function () {
    const wallet = ethers.Wallet.createRandom(ethers.provider);
    const walletAsInstance = this.mock.attach(wallet.address);
    await this.signer.sendTransaction({ to: wallet.address, value: ethers.WeiPerEther });

    const tx = this.instance.connect(wallet).log.delegateCall();
    await expect(tx).to.not.emit(this.instance, 'Context')
    await expect(tx).to.emit(walletAsInstance, 'Context').withArgs(wallet, wallet, 0n, anyValue);
  });

  it('events', async function () {
    const tx1 = this.instance.log.send({ value: 1n });
    await expect(tx1).to.emit(this.instance, 'Context').withArgs(this.instance, this.signer, 1n, 1n);
    await expect(tx1).to.not.emit(this.signerAsInstance, 'Context');

    const tx2 = this.instance.log.delegateCall();
    await expect(tx2).to.not.emit(this.instance, 'Context')
    await expect(tx2).to.emit(this.signerAsInstance, 'Context').withArgs(this.signer, this.signer, 0n, anyValue);
  });

  it('call #1', async function () {
    const target = ethers.Wallet.createRandom();
    await expect(this.instance.call.delegateCall(target, 100n, '0x'))
      .to.changeEtherBalances([ this.signer, target, this.instance], [ -100n, 100n, 0n ]);
  });

  it('call #2', async function () {
    await expect(this.batch.exec.delegateCall([{
      target: this.instance,
      value: 1n,
      data: this.instance.interface.encodeFunctionData('log')
    }]))
      .to.emit(this.instance, 'Context')
      .withArgs(this.instance, this.signer, 1n, 1n);
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