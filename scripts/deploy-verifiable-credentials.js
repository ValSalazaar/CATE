const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Desplegando VerifiableCredentials...");

  // Obtener el deployer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy del contrato
  const VerifiableCredentials = await ethers.getContractFactory("VerifiableCredentials");
  const verifiableCredentials = await VerifiableCredentials.deploy();
  
  await verifiableCredentials.waitForDeployment();
  const address = await verifiableCredentials.getAddress();

  console.log("✅ VerifiableCredentials desplegado en:", address);

  // Verificar que el deployer es autorizado
  const isAuthorized = await verifiableCredentials.isAuthorizedIssuer(deployer.address);
  console.log("🔐 Deployer autorizado:", isAuthorized);

  // Información para .env
  console.log("\n📋 Variables para .env:");
  console.log(`VC_CONTRACT_ADDRESS=${address}`);
  console.log(`VC_DEPLOYER_ADDRESS=${deployer.address}`);

  // Guardar la dirección en un archivo para referencia
  const fs = require('fs');
  const deploymentInfo = {
    contract: "VerifiableCredentials",
    address: address,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployments/verifiable-credentials-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 ¡Deployment completado exitosamente!");
  console.log("📁 Información guardada en deployments/");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en deployment:", error);
    process.exit(1);
  });
