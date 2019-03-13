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

  it('generate tokens at pre ICO', async function () {
    await time.increaseTo(this.openingTime);

    const investmentAmount = ether('1');

    let investor_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    await waitForEvent(this.events.TokensPurchased)

    let investor_balance2 = await this.token.balanceOf(investor)
    
    this.pre_ico_amount = investor_balance2.sub(investor_balance1)
  });

  it('generate tokens at stage 1', async function () {
    await time.increaseTo(this.preICOEndTime.add(time.duration.seconds(1)));

    const investmentAmount = ether('1');

    let investor_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    await waitForEvent(this.events.TokensPurchased)

    let investor_balance2 = await this.token.balanceOf(investor)
    
    this.stage_1_amount = investor_balance2.sub(investor_balance1)
  });

  it('generate tokens at stage 2', async function () {
    await time.increaseTo(this.firstStageEndTime.add(time.duration.seconds(1)));

    const investmentAmount = ether('1');

    let investor_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    await waitForEvent(this.events.TokensPurchased)

    let investor_balance2 = await this.token.balanceOf(investor)
    
    this.stage_2_amount = investor_balance2.sub(investor_balance1)
  });

  it('generate tokens at stage 3', async function () {
    await time.increaseTo(this.secondStageEndTime.add(time.duration.seconds(1)));

    const investmentAmount = ether('1');

    let investor_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    await waitForEvent(this.events.TokensPurchased)

    let investor_balance2 = await this.token.balanceOf(investor)
    
    this.stage_3_amount = investor_balance2.sub(investor_balance1)
  });

  it('should generate correct bonus tokens for stages', async function () {
    this.pre_ico_amount.should.be.bignumber.greaterThan(this.stage_1_amount)
    this.stage_1_amount.should.be.bignumber.greaterThan(this.stage_2_amount)
    this.stage_2_amount.should.be.bignumber.greaterThan(this.stage_3_amount)
  });

  it('should generate additional tokens after finalization', async function () {
    await time.increaseTo(this.openingTime);

    await this.crowdsale.send(GOAL);

    await waitForEvent(this.events.TokensPurchased)

    let total_supply = await this.token.totalSupply()

    await time.increaseTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: owner });

    let firstHalfTeamTokens = new BN(await this.crowdsale.firstHalfTeamTokens())
    let secondHalfTeamTokens = new BN(await this.crowdsale.secondHalfTeamTokens())
    let firstHalfAdvisersTokens = new BN(await this.crowdsale.firstHalfAdvisersTokens())
    let secondHalfAdvisersTokens = new BN(await this.crowdsale.secondHalfAdvisersTokens())
    let bountiesTokens = new BN(await this.crowdsale.bountiesTokens())
    let projectTokens = new BN(await this.crowdsale.projectTokens())

    let total_additional_tokens = new BN(firstHalfTeamTokens.add(secondHalfTeamTokens).add(firstHalfAdvisersTokens).add(secondHalfAdvisersTokens).add(bountiesTokens).add(projectTokens))

    total_additional_tokens.should.be.bignumber.greaterThan(total_supply)
  });

  it('should allow getting additional tokens after finalization', async function () {
    await time.increaseTo(this.openingTime);

    await this.crowdsale.send(GOAL);

    await waitForEvent(this.events.TokensPurchased)

    await time.increaseTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: owner });

    let wallet_balance1 = await this.token.balanceOf(wallet)

    let bountiesTokens = new BN(await this.crowdsale.bountiesTokens())
    let firstHalfAdvisersTokens = new BN(await this.crowdsale.firstHalfAdvisersTokens())

    await this.crowdsale.getBountiesTokens(wallet, bountiesTokens, { from: owner })

    let wallet_balance2 = await this.token.balanceOf(wallet)

    wallet_balance2.should.be.bignumber.greaterThan(wallet_balance1)
    wallet_balance2.sub(wallet_balance1).sub(bountiesTokens).should.be.bignumber.equal('0')

    bountiesTokens = new BN(await this.crowdsale.bountiesTokens())

    bountiesTokens.should.be.bignumber.equal('0')

    await shouldFail.reverting(this.crowdsale.getFirstHalfAdvisersTokens(wallet, firstHalfAdvisersTokens, { from: owner }));

    await time.increaseTo(this.closingTime.add(time.duration.weeks(27)));

    await this.crowdsale.getFirstHalfAdvisersTokens(wallet, firstHalfAdvisersTokens.div(new BN('2')), { from: owner })

    let remainder = new BN(await this.crowdsale.firstHalfAdvisersTokens())

    let wallet_balance3 = await this.token.balanceOf(wallet)

    // wallet_balance3.sub(wallet_balance2).should.be.bignumber.equal(remainder)

    await this.crowdsale.getFirstHalfAdvisersTokens(wallet, remainder, { from: owner })

    let wallet_balance4 = await this.token.balanceOf(wallet)

    wallet_balance4.sub(wallet_balance2).sub(firstHalfAdvisersTokens).should.be.bignumber.equal('0')
  });

  it('should reject generating additional tokens from anyone but owner', async function () {
    await time.increaseTo(this.openingTime);

    await this.crowdsale.send(GOAL);

    await waitForEvent(this.events.TokensPurchased)

    await time.increaseTo(this.afterClosingTime);

    await this.crowdsale.finalize({ from: investor });

    await time.increaseTo(this.closingTime.add(time.duration.weeks(27)));

    let firstHalfAdvisersTokens = new BN(await this.crowdsale.firstHalfAdvisersTokens())
    await shouldFail.reverting(this.crowdsale.getFirstHalfAdvisersTokens(wallet, firstHalfAdvisersTokens, { from: investor }));
    await this.crowdsale.getFirstHalfAdvisersTokens(wallet, firstHalfAdvisersTokens, { from: owner });
  });
});
