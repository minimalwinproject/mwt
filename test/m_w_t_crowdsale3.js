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

  // it('New test', async function () {
  //   await time.increaseTo(this.openingTime);

  //   const investmentAmount = ether('1');

  //   let wallet_balance1 = await balance.current(investor)

  //   await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

  //   let wallet_balance2 = await balance.current(investor)

  //   wallet_balance2.add(investmentAmount).should.be.bignumber.equal(wallet_balance1);

  //   await this.crowdsale.refundLostTransfer({ from: investor, gasPrice: 0 })

  //   await methods.__callback

  //   // await waitForEvent(this.events.TokensPurchased)

  //   let wallet_balance3 = await balance.current(investor)

  //   let balance_diff = wallet_balance3.sub(wallet_balance1)

  //   balance_diff.should.be.bignumber.equal('0');
  // });

  it('Should allow refunding lost transfer', async function () {
    await time.increaseTo(this.openingTime);

    const investmentAmount = ether('1');

    let wallet_balance1 = await balance.current(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    let wallet_balance2 = await balance.current(investor)

    wallet_balance2.add(investmentAmount).should.be.bignumber.equal(wallet_balance1);

    await this.crowdsale.refundLostTransfer({ from: investor, gasPrice: 0 })

    // await waitForEvent(this.events.TokensPurchased)

    let wallet_balance3 = await balance.current(investor)

    let balance_diff = wallet_balance3.sub(wallet_balance1)

    balance_diff.should.be.bignumber.equal('0');
  });


});
