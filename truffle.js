// Allows us to use ES6 in our migrations and tests.
require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity\/test\/helpers)/
});
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      gas: 6712388,
      gasPrice: 2000000000,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "4", // Rinkeby ID 4
      from: "", // account from which to deploy
      gas: 6712388,
      gasPrice: 2000000000
    },
    live: {
      network_id: 1,
      gas: 6712388,
      gasPrice: 2000000000,
      host: "127.0.0.1",
      port: 8546,
      from: "" // account from which to deploy
    }
  }
};
