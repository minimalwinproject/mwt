const { BN, balance, ether, should, shouldFail, time } = require('openzeppelin-test-helpers');

var utils = require('web3-utils');
const fetch = require("node-fetch");

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

  it('Test token amount 0.25 ether stage 3', async function () {
    const url = "http://35.205.73.238:7575/ethAvgRate";
    let rate = new BN('0')
    const getData = async url => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        rate = new BN(json.rate*1000000)
        // console.log(json);
      } catch (error) {
        console.log(error);
      }
    };
    await getData(url);

    rate.should.be.bignumber.greaterThan('0');

    const investmentAmount = ether('0.25');

    const lowest_expected_tokens = investmentAmount.mul(rate).mul(new BN('97')).mul(new BN('10')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))
    const highest_expected_tokens = investmentAmount.mul(rate).mul(new BN('103')).mul(new BN('10')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))

    await time.increaseTo(this.secondStageEndTime.add(time.duration.seconds(1)));

    let token_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    await waitForEvent(this.events.TokensPurchased)

    let token_balance2 = await this.token.balanceOf(investor)

    let token_balance_diff = token_balance2.sub(token_balance1)

    token_balance_diff.should.be.bignumber.greaterThan(lowest_expected_tokens);
    token_balance_diff.should.be.bignumber.lessThan(highest_expected_tokens);
  });

  it('Test token amount 1 ether stage 3', async function () {
    const url = "http://35.205.73.238:7575/ethAvgRate";
    let rate = new BN('0')
    const getData = async url => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        rate = new BN(json.rate*1000000)
        // console.log(json);
      } catch (error) {
        console.log(error);
      }
    };
    await getData(url);

    rate.should.be.bignumber.greaterThan('0');

    const investmentAmount = ether('1');

    const lowest_expected_tokens = investmentAmount.mul(rate).mul(new BN('97')).mul(new BN('10')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))
    const highest_expected_tokens = investmentAmount.mul(rate).mul(new BN('103')).mul(new BN('10')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))

    await time.increaseTo(this.secondStageEndTime.add(time.duration.seconds(1)));

    let token_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    await waitForEvent(this.events.TokensPurchased)

    let token_balance2 = await this.token.balanceOf(investor)

    let token_balance_diff = token_balance2.sub(token_balance1)

    token_balance_diff.should.be.bignumber.greaterThan(lowest_expected_tokens);
    token_balance_diff.should.be.bignumber.lessThan(highest_expected_tokens);
  });

  it('Test token amount 1 ether stage 2', async function () {
    const url = "http://35.205.73.238:7575/ethAvgRate";
    let rate = new BN('0')
    const getData = async url => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        rate = new BN(json.rate*1000000)
        // console.log(json);
      } catch (error) {
        console.log(error);
      }
    };
    await getData(url);

    rate.should.be.bignumber.greaterThan('0');

    const investmentAmount = ether('1');

    const lowest_expected_tokens = investmentAmount.mul(rate).mul(new BN('97')).mul(new BN('10')).mul(new BN('105')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))
    const highest_expected_tokens = investmentAmount.mul(rate).mul(new BN('103')).mul(new BN('10')).mul(new BN('105')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))

    await time.increaseTo(this.firstStageEndTime.add(time.duration.seconds(1)));

    let token_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    await waitForEvent(this.events.TokensPurchased)

    let token_balance2 = await this.token.balanceOf(investor)

    let token_balance_diff = token_balance2.sub(token_balance1)

    token_balance_diff.should.be.bignumber.greaterThan(lowest_expected_tokens);
    token_balance_diff.should.be.bignumber.lessThan(highest_expected_tokens);
  });

  it('Test token amount 1 ether stage 1', async function () {
    const url = "http://35.205.73.238:7575/ethAvgRate";
    let rate = new BN('0')
    const getData = async url => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        rate = new BN(json.rate*1000000)
        // console.log(json);
      } catch (error) {
        console.log(error);
      }
    };
    await getData(url);

    rate.should.be.bignumber.greaterThan('0');

    const investmentAmount = ether('1');

    const lowest_expected_tokens = investmentAmount.mul(rate).mul(new BN('97')).mul(new BN('10')).mul(new BN('115')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))
    const highest_expected_tokens = investmentAmount.mul(rate).mul(new BN('103')).mul(new BN('10')).mul(new BN('115')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))

    await time.increaseTo(this.preICOEndTime.add(time.duration.seconds(1)));

    let token_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    await waitForEvent(this.events.TokensPurchased)

    let token_balance2 = await this.token.balanceOf(investor)

    let token_balance_diff = token_balance2.sub(token_balance1)

    token_balance_diff.should.be.bignumber.greaterThan(lowest_expected_tokens);
    token_balance_diff.should.be.bignumber.lessThan(highest_expected_tokens);
  });

  it('Test token amount 1 ether pre ICO', async function () {
    const url = "http://35.205.73.238:7575/ethAvgRate";
    let rate = new BN('0')
    const getData = async url => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        rate = new BN(json.rate*1000000)
        // console.log(json);
      } catch (error) {
        console.log(error);
      }
    };
    await getData(url);

    rate.should.be.bignumber.greaterThan('0');

    const investmentAmount = ether('1');

    const lowest_expected_tokens = investmentAmount.mul(rate).mul(new BN('97')).mul(new BN('10')).mul(new BN('125')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))
    const highest_expected_tokens = investmentAmount.mul(rate).mul(new BN('103')).mul(new BN('10')).mul(new BN('125')).div(new BN('100')).div(new BN('100')).div(new BN('1000000')).div(new BN('1000000000000000000'))

    await time.increaseTo(this.openingTime);

    let token_balance1 = await this.token.balanceOf(investor)

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor, gasPrice: 0  });

    await waitForEvent(this.events.TokensPurchased)

    let token_balance2 = await this.token.balanceOf(investor)

    let token_balance_diff = token_balance2.sub(token_balance1)

    token_balance_diff.should.be.bignumber.greaterThan(lowest_expected_tokens);
    token_balance_diff.should.be.bignumber.lessThan(highest_expected_tokens);
  });

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
