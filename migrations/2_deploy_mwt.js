const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");

module.exports = function(deployer, network) {
    if (network === 'test' || network === 'develop') {
    }
    else {
        deployer.deploy(MinimalWinToken);
    }
};
