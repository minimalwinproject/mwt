const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");
const MWTCrowdsale = artifacts.require("./MWTCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    if (network === 'test' || network === 'develop') {
        
    }
    else {
        const openingTime = new web3.utils.BN((new Date("2019/5/01 00:00:01")).getTime()/1000|0)
        const preICOEndTime = new web3.utils.BN((new Date("2019/5/08 00:00:01")).getTime()/1000|0)
        const firstStageEndTime = new web3.utils.BN((new Date("2019/5/18 00:00:01")).getTime()/1000|0)
        const secondStageEndTime = new web3.utils.BN((new Date("2019/5/28 00:00:01")).getTime()/1000|0)
        const closingTime = new web3.utils.BN((new Date("2019/6/09 00:00:01")).getTime()/1000|0)
        const wallet = accounts[0];
        const token = MinimalWinToken.address;
        const goal = web3.utils.toWei("30000", "ether")
        const cap = web3.utils.toWei("80000", "ether")

        deployer.deploy(MWTCrowdsale, openingTime, closingTime, preICOEndTime, firstStageEndTime, secondStageEndTime, wallet, token, goal, cap).then(() => {
            MinimalWinToken.deployed().then(function(instance) {
                instance.addMinter(MWTCrowdsale.address);
                instance.renounceMinter()
            });
        })
    }
};