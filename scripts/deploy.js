const { ethers } = require("hardhat");

async function main() {
  const CatePayments = await ethers.getContractFactory("CatePayments");
  const contract = await CatePayments.deploy("0x...direccionStablecoin");
  await contract.deployed();
  console.log("CatePayments desplegado en:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
