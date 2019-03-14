const { BN, balance, ether, should, shouldFail, time } = require('openzeppelin-test-helpers');

var utils = require('web3-utils');

const Web3 = require('web3')
const { waitForEvent } = require('./utils')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:7545'))

const MWTCrowdsale = artifacts.require('MWTCrowdsale');
const MinimalWinToken = artifacts.require('MinimalWinToken');

const GOAL = ether('20');
const CAP = ether('60');

contract('MWTCrowdsale', function ([_, deployer, owner, wallet, investor]) {
  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.preICOEndTime = this.openingTime.add(time.duration.weeks(1));
    this.firstStageEndTime = this.preICOEndTime.add(time.duration.days(10));
    this.secondStageEndTime = this.firstStageEndTime.add(time.duration.days(10));
    this.closingTime = this.secondStageEndTime.add(time.duration.days(10));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

    this.token = await MinimalWinToken.new({ from: deployer });
    this.crowdsale = await MWTCrowdsale.new(
      this.openingTime, this.closingTime, this.preICOEndTime, this.firstStageEndTime, this.secondStageEndTime, wallet, this.token.address, GOAL, CAP,
      { from: owner }
    );

    await this.token.addMinter(this.crowdsale.address, { from: deployer });
    await this.token.renounceMinter({ from: deployer });

    let contract = new web3.eth.Contract(
      MWTCrowdsale._json.abi,
      this.crowdsale.address
    )

    this.events = contract.events
  });

  it('should create crowdsale with correct parameters', async function () {
    should.exist(this.crowdsale);
    should.exist(this.token);

    (await this.crowdsale.openingTime()).should.be.bignumber.equal(this.openingTime);
    (await this.crowdsale.closingTime()).should.be.bignumber.equal(this.closingTime);
    (await this.crowdsale.wallet()).should.be.equal(wallet);
    (await this.crowdsale.goal()).should.be.bignumber.equal(GOAL);
    (await this.crowdsale.cap()).should.be.bignumber.equal(CAP);
  });

  it('should not accept payments before start', async function () {
    await shouldFail.reverting(this.crowdsale.send(ether('1')));
    await shouldFail.reverting(this.crowdsale.buyTokens(investor, { from: investor, value: ether('1') }));
  });

  it('should accept payments during the sale', async function () {
    const investmentAmount = ether('1');

    await time.increaseTo(this.openingTime);

    let response = await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    // Confirm new oraclize query event emitted
    let log = response.logs[0]
    assert.equal(log.event, 'LogNewOraclizeQuery', 'LogNewOraclizeQuery not emitted.')
    assert.equal(log.args.description, 'Oraclize query was sent, standing by for the answer..', 'Incorrect description emitted.')

    // const {
    //   returnValues: {
    //     purchaser,
    //     beneficiary,
    //     value,
    //     amount
    //   }
    // } = await waitForEvent(this.events.TokensPurchased)

    // console.log("HERE SHOULD BE DESCRIPTION")
    // console.log(purchaser)
    // console.log(beneficiary)
    // console.log(value)
    // console.log(amount)

    await waitForEvent(this.events.TokensPurchased)

    // console.log((await this.token.balanceOf(investor)).toString())

    let investor_balance = await this.token.balanceOf(investor)

    investor_balance.should.be.bignumber.greaterThan('0');
    (await this.token.totalSupply()).should.be.bignumber.equal(investor_balance);
  });

  it('should reject payments after end', async function () {
    await time.increaseTo(this.afterClosingTime);
    await shouldFail.reverting(this.crowdsale.send(ether('1')));
    await shouldFail.reverting(this.crowdsale.buyTokens(investor, { value: ether('1'), from: investor }));
  });

  it('should reject payments over cap', async function () {
    await time.increaseTo(this.openingTime);
    await this.crowdsale.send(CAP);
    await shouldFail.reverting(this.crowdsale.send(1));
  });

  it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
    await time.increaseTo(this.openingTime);

    let wallet_balance1 = await balance.current(wallet)

    await this.crowdsale.send(GOAL);

    await waitForEvent(this.events.TokensPurchased)

    await time.increaseTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: owner });

    let wallet_balance2 = await balance.current(wallet)

    let balance_diff = wallet_balance2.sub(wallet_balance1)

    balance_diff.should.be.bignumber.equal(GOAL)
  });

  it('should allow refunds if the goal is not reached', async function () {
    await time.increaseTo(this.openingTime);

    let wallet_balance1 = await balance.current(investor)

    await this.crowdsale.sendTransaction({ value: ether('1'), from: investor, gasPrice: 0 });
    await waitForEvent(this.events.TokensPurchased)

    await time.increaseTo(this.afterClosingTime);

    await this.crowdsale.finalize({ from: owner });
    await this.crowdsale.claimRefund(investor, { gasPrice: 0 });

    let wallet_balance2 = await balance.current(investor)
    let balance_diff = wallet_balance2.sub(wallet_balance1)

    balance_diff.should.be.bignumber.equal('0');
  });

  describe('when goal > cap', function () {
    // goal > cap
    const HIGH_GOAL = ether('1000000');

    it('creation reverts', async function () {
      await shouldFail.reverting(MWTCrowdsale.new(
        this.openingTime, this.closingTime, this.preICOEndTime, this.firstStageEndTime, this.secondStageEndTime, wallet, this.token.address, HIGH_GOAL, CAP,
      ));
    });
  });
});
