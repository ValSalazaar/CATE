const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Desplegando VerifiableCredentials...");

  // Obtener el deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy del contrato
  const VerifiableCredentials = await hre.ethers.getContractFactory("VerifiableCredentials");
  const verifiableCredentials = await VerifiableCredentials.deploy();
  
  await verifiableCredentials.waitForDeployment();
  const address = await verifiableCredentials.getAddress();

  console.log("✅ VerifiableCredentials desplegado en:", address);

  // Verificar que el deployer es autorizado
  const isAuthorized = await verifiableCredentials.isAuthorizedIssuer(deployer.address);
  console.log("🔐 Deployer autorizado:", isAuthorized);

  // Obtener el owner
  const owner = await verifiableCredentials.owner();
  console.log("👑 Owner del contrato:", owner);

  // Usar artifacts para obtener ABI estable
  const artifact = await hre.artifacts.readArtifact("VerifiableCredentials");
  const outDir = path.join(__dirname, "../abi");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "VerifiableCredentials.json");
  const deploymentInfo = {
    contract: "VerifiableCredentials",
    address: address,
    deployer: deployer.address,
    owner: owner,
    network: (await hre.ethers.provider.getNetwork()).name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
    abi: artifact.abi
  };

  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📦 ABI + address →", outPath);

  // Información para .env
  console.log("\n📋 Variables para .env:");
  console.log(`VC_CONTRACT_ADDRESS=${address}`);
  console.log(`VC_DEPLOYER_ADDRESS=${deployer.address}`);
  console.log(`VC_OWNER_ADDRESS=${owner}`);

  // Guardar la dirección en un archivo de deployment
  const deploymentPath = path.join(__dirname, `../deployments/verifiable-credentials-${Date.now()}.json`);
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 ¡Deployment completado exitosamente!");
  console.log("📁 Información guardada en deployments/");
  console.log("🔗 Contrato verificado y listo para usar");

  return address;
}

main().catch((error) => {
  console.error("❌ Error en deployment:", error);
  process.exitCode = 1;
});
