const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying CateCertificates contract...");

  // Get the contract factory
  const CateCertificates = await ethers.getContractFactory("CateCertificates");

  // Deploy the contract
  const cateCertificates = await CateCertificates.deploy();

  // Wait for deployment to finish
  await cateCertificates.waitForDeployment();

  const contractAddress = await cateCertificates.getAddress();
  const deployer = await ethers.provider.getSigner();
  const deployerAddress = await deployer.getAddress();

  console.log("✅ CateCertificates deployed successfully!");
  console.log("📋 Contract Details:");
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Network: ${network.name}`);
  console.log(`   Deployer: ${deployerAddress}`);
  console.log(`   Block Number: ${await ethers.provider.getBlockNumber()}`);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  try {
    // Check if contract is deployed
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("Contract not deployed");
    }

    // Get contract stats
    const [totalCertificates, totalIssuers] = await cateCertificates.getStats();
    console.log(`   Total Certificates: ${totalCertificates.toString()}`);
    console.log(`   Total Issuers: ${totalIssuers.toString()}`);

    // Check if deployer is authorized issuer
    const isAuthorized = await cateCertificates.isAuthorizedIssuer(deployerAddress);
    console.log(`   Deployer is authorized issuer: ${isAuthorized}`);

    // Get deployer issuer details
    const issuerDetails = await cateCertificates.getIssuer(deployerAddress);
    console.log(`   Deployer issuer name: ${issuerDetails.name}`);
    console.log(`   Deployer issuer active: ${issuerDetails.isActive}`);

    console.log("✅ Contract verification successful!");

  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    contractName: "CateCertificates",
    contractAddress: contractAddress,
    network: network.name,
    deployer: deployerAddress,
    deploymentTime: new Date().toISOString(),
    abi: CateCertificates.interface.format()
  };

  // Write to file
  const fs = require('fs');
  const deploymentPath = `deployments/${network.name}`;
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    `${deploymentPath}/cate-certificates.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\n📄 Deployment info saved to: ${deploymentPath}/cate-certificates.json`);

  // Environment variables template
  console.log("\n🔧 Environment Variables:");
  console.log(`CATE_CERT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`POLYGON_RPC_URL=https://polygon-rpc.com`);
  console.log(`ISSUER_PRIVATE_KEY=your_private_key_here`);

  // Next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Add the contract address to your .env file");
  console.log("2. Configure your issuer private key");
  console.log("3. Add authorized issuers using the contract's addIssuer function");
  console.log("4. Test certificate issuance and verification");

  return {
    contractAddress,
    deployerAddress,
    network: network.name
  };
}

// Handle errors
main()
  .then((result) => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment failed:", error);
    process.exit(1);
  });
