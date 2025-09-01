const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting SimBank Token deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(
    "🌐 Network:",
    network.name,
    "Chain ID:",
    network.chainId.toString()
  );
  console.log("-----------------------------------\n");

  // Get deployment parameters from environment or use defaults
  const initialSupply = ethers.parseEther(
    process.env.INITIAL_SUPPLY || "1000000" // 1 million tokens by default
  );

  console.log("📝 Deployment Parameters:");
  console.log("   Token Name: SimBank");
  console.log("   Token Symbol: SB");
  console.log("   Initial Supply:", ethers.formatEther(initialSupply), "SB");
  console.log("   Admin Address:", deployer.address);
  console.log("-----------------------------------\n");

  try {
    // Get the contract factory
    console.log("🏭 Preparing SimBankToken contract...");
    const SimBankToken = await ethers.getContractFactory("SimBankToken");

    // Deploy the upgradeable proxy
    console.log("📦 Deploying upgradeable proxy...");
    const simBankToken = await upgrades.deployProxy(
      SimBankToken,
      [initialSupply, deployer.address],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );

    // Wait for deployment
    await simBankToken.waitForDeployment();
    const proxyAddress = await simBankToken.getAddress();

    console.log("✅ SimBankToken deployed successfully!");
    console.log("-----------------------------------\n");

    // Get implementation address
    const implementationAddress =
      await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

    console.log("📍 Deployment Addresses:");
    console.log("   Proxy Address:", proxyAddress);
    console.log("   Implementation Address:", implementationAddress);
    console.log("   ProxyAdmin Address:", adminAddress);
    console.log("-----------------------------------\n");

    // Verify initial setup
    console.log("🔍 Verifying deployment...");
    const name = await simBankToken.name();
    const symbol = await simBankToken.symbol();
    const totalSupply = await simBankToken.totalSupply();
    const decimals = await simBankToken.decimals();
    const version = await simBankToken.version();
    const maxSupply = await simBankToken.MAX_SUPPLY();

    console.log("   Token Name:", name);
    console.log("   Token Symbol:", symbol);
    console.log("   Decimals:", decimals.toString());
    console.log("   Total Supply:", ethers.formatEther(totalSupply), symbol);
    console.log("   Max Supply:", ethers.formatEther(maxSupply), symbol);
    console.log("   Contract Version:", version);
    console.log("-----------------------------------\n");

    // Check roles
    console.log("🔐 Checking roles...");
    const DEFAULT_ADMIN_ROLE = await simBankToken.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await simBankToken.MINTER_ROLE();
    const PAUSER_ROLE = await simBankToken.PAUSER_ROLE();
    const UPGRADER_ROLE = await simBankToken.UPGRADER_ROLE();

    const hasAdminRole = await simBankToken.hasRole(
      DEFAULT_ADMIN_ROLE,
      deployer.address
    );
    const hasMinterRole = await simBankToken.hasRole(
      MINTER_ROLE,
      deployer.address
    );
    const hasPauserRole = await simBankToken.hasRole(
      PAUSER_ROLE,
      deployer.address
    );
    const hasUpgraderRole = await simBankToken.hasRole(
      UPGRADER_ROLE,
      deployer.address
    );

    console.log("   Admin Role:", hasAdminRole ? "✅" : "❌");
    console.log("   Minter Role:", hasMinterRole ? "✅" : "❌");
    console.log("   Pauser Role:", hasPauserRole ? "✅" : "❌");
    console.log("   Upgrader Role:", hasUpgraderRole ? "✅" : "❌");
    console.log("-----------------------------------\n");

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      proxyAddress: proxyAddress,
      implementationAddress: implementationAddress,
      adminAddress: adminAddress,
      deployer: deployer.address,
      initialSupply: ethers.formatEther(initialSupply),
      deploymentDate: new Date().toISOString(),
      version: version,
    };

    const fs = require("fs");
    const deploymentFile = `./deployments/deployment-${network.chainId}.json`;

    // Create deployments directory if it doesn't exist
    if (!fs.existsSync("./deployments")) {
      fs.mkdirSync("./deployments");
    }

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile);
    console.log("-----------------------------------\n");

    // Provide verification command
    console.log("🔍 To verify the contract on block explorer, run:");
    console.log(
      `   npx hardhat verify --network ${
        process.env.HARDHAT_NETWORK || "hardhat"
      } ${implementationAddress}`
    );
    console.log("-----------------------------------\n");

    console.log("🎉 Deployment completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Save your proxy address:", proxyAddress);
    console.log("   2. Add the token to your wallet using the proxy address");
    console.log("   3. Verify the contract on the block explorer");
    console.log("   4. Configure roles and permissions as needed");
    console.log("   5. Test token transfers and features\n");

    return {
      proxyAddress,
      implementationAddress,
      adminAddress,
    };
  } catch (error) {
    console.error("❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
