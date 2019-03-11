const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");
const MWTCrowdsale = artifacts.require("./MWTCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    const openingTime = Date.now()/1000|0 + 20// 20 seconds in the future
    // const closingTime = openingTime + (86400 * 20) // 20 days
    const closingTime = openingTime + (3600 * 48) // 48s hours
    const wallet = accounts[0];
    const token = MinimalWinToken.address;
    const stageDuration = 3600 * 12;
    const cap = web3.utils.toWei("37000", "ether")

    deployer.deploy(MWTCrowdsale, openingTime, closingTime, wallet, token, stageDuration, cap).then(() => {
        MinimalWinToken.deployed().then(function(instance) {
            instance.addMinter(MWTCrowdsale.address);
            instance.renounceMinter()
        });
    })
};