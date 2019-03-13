module.exports = {
  networks: {
    test: {
      host: "127.0.0.1",
      port: 7545,
      gas: 6712388,
      gasPrice: 2000000000,
      network_id: "*" // Match any network id
    },
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
      websockets: true,
      from: "0xfD35245Ca9642e6FbE0118887355ea645d0A11cf", // account from which to deploy
      gas: 6712388,
      gasPrice: 2000000000
    },
    live: {
      network_id: 1,
      websockets: true,
      gas: 6712388,
      gasPrice: 2000000000,
      host: "127.0.0.1",
      port: 8546,
      from: "" // account from which to deploy
    }
  },
  solc: {
      optimizer: {
          enabled: true,
          runs: 200
      }
  }
};
