var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, network) {
  if (network === 'test') {
  }
  else {
      deployer.deploy(Migrations);
  }
};
