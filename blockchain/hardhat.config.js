require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: RPC_URL || "https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80001
    },
    goerli: {
      url: RPC_URL || "https://goerli.infura.io/v3/YOUR_PROJECT_ID",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 5
    },
    sepolia: {
      url: RPC_URL || "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
