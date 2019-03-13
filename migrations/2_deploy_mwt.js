const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");

module.exports = function(deployer, network) {
    if (network === 'test') {
    }
    else {
        deployer.deploy(MinimalWinToken);
    }
};
