const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");

module.exports = function(deployer) {
    deployer.deploy(MinimalWinToken);
};
