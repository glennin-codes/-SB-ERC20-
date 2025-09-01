const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting SimBank Token upgrade...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Upgrading contracts with account:", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(
    "🌐 Network:",
    network.name,
    "Chain ID:",
    network.chainId.toString()
  );
  console.log("-----------------------------------\n");

  try {
    // Load deployment info
    const deploymentFile = `./deployments/deployment-${network.chainId}.json`;

    if (!fs.existsSync(deploymentFile)) {
      throw new Error(
        `Deployment file not found: ${deploymentFile}\nPlease deploy the contract first using 'npm run deploy'`
      );
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const proxyAddress = deploymentInfo.proxyAddress;

    console.log("📍 Current deployment:");
    console.log("   Proxy Address:", proxyAddress);
    console.log(
      "   Current Implementation:",
      deploymentInfo.implementationAddress
    );
    console.log("   Current Version:", deploymentInfo.version);
    console.log("-----------------------------------\n");

    // Get the current contract instance
    const SimBankToken = await ethers.getContractFactory("SimBankToken");
    const currentContract = SimBankToken.attach(proxyAddress);

    // Check current version
    const currentVersion = await currentContract.version();
    console.log("📌 Current contract version:", currentVersion);

    // Check if deployer has upgrader role
    const UPGRADER_ROLE = await currentContract.UPGRADER_ROLE();
    const hasUpgraderRole = await currentContract.hasRole(
      UPGRADER_ROLE,
      deployer.address
    );

    if (!hasUpgraderRole) {
      throw new Error(
        "❌ Deployer does not have UPGRADER_ROLE. Please grant the role first."
      );
    }
    console.log("✅ Deployer has UPGRADER_ROLE\n");

    // Get the new contract factory (SimBankTokenV2)
    console.log("🏭 Preparing SimBankTokenV2 contract...");
    const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");

    // Perform the upgrade
    console.log("📦 Upgrading proxy to new implementation...");
    console.log("⏳ This may take a few moments...\n");

    const upgradedContract = await upgrades.upgradeProxy(
      proxyAddress,
      SimBankTokenV2,
      { kind: "uups" }
    );

    await upgradedContract.waitForDeployment();
    console.log("✅ Proxy upgraded successfully!");
    console.log("-----------------------------------\n");

    // Initialize V2 features (if needed)
    console.log("🔧 Initializing V2 features...");
    const stakingRewardRate = 10; // 0.1% daily reward rate (10 basis points)

    try {
      const tx = await upgradedContract.initializeV2(stakingRewardRate);
      await tx.wait();
      console.log("✅ V2 features initialized");
      console.log(
        "   Staking Reward Rate:",
        stakingRewardRate / 100,
        "% per day"
      );
    } catch (error) {
      if (error.message.includes("already initialized")) {
        console.log("ℹ️  V2 already initialized");
      } else {
        throw error;
      }
    }
    console.log("-----------------------------------\n");

    // Get new implementation address
    const newImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(proxyAddress);

    // Verify the upgrade
    console.log("🔍 Verifying upgrade...");
    const newVersion = await upgradedContract.version();
    const name = await upgradedContract.name();
    const symbol = await upgradedContract.symbol();
    const totalSupply = await upgradedContract.totalSupply();

    console.log("   Token Name:", name);
    console.log("   Token Symbol:", symbol);
    console.log("   Total Supply:", ethers.formatEther(totalSupply), symbol);
    console.log("   Old Version:", currentVersion);
    console.log("   New Version:", newVersion);
    console.log("   New Implementation:", newImplementationAddress);
    console.log("-----------------------------------\n");

    // Test new V2 features
    console.log("🧪 Testing V2 features...");
    try {
      const stakingRate = await upgradedContract.stakingRewardRate();
      console.log("   ✅ Staking feature available");
      console.log(
        "   Staking Reward Rate:",
        stakingRate.toString(),
        "basis points per day"
      );
    } catch (error) {
      console.log("   ❌ V2 features not available");
    }
    console.log("-----------------------------------\n");

    // Update deployment info
    const updatedDeploymentInfo = {
      ...deploymentInfo,
      previousImplementation: deploymentInfo.implementationAddress,
      implementationAddress: newImplementationAddress,
      previousVersion: deploymentInfo.version,
      version: newVersion,
      upgradeDate: new Date().toISOString(),
      upgradedBy: deployer.address,
    };

    // Save updated deployment info
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify(updatedDeploymentInfo, null, 2)
    );
    console.log("💾 Updated deployment info saved to:", deploymentFile);

    // Create upgrade history
    const historyFile = `./deployments/upgrade-history-${network.chainId}.json`;
    let history = [];

    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    }

    history.push({
      date: new Date().toISOString(),
      fromVersion: currentVersion,
      toVersion: newVersion,
      fromImplementation: deploymentInfo.implementationAddress,
      toImplementation: newImplementationAddress,
      upgradedBy: deployer.address,
      transactionHash: upgradedContract.deploymentTransaction()?.hash || "N/A",
    });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log("📚 Upgrade history saved to:", historyFile);
    console.log("-----------------------------------\n");

    // Provide verification command
    console.log("🔍 To verify the new implementation on block explorer, run:");
    console.log(
      `   npx hardhat verify --network ${
        process.env.HARDHAT_NETWORK || "hardhat"
      } ${newImplementationAddress}`
    );
    console.log("-----------------------------------\n");

    console.log("🎉 Upgrade completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   Proxy Address (unchanged):", proxyAddress);
    console.log("   New Implementation:", newImplementationAddress);
    console.log("   Version upgraded from", currentVersion, "to", newVersion);
    console.log("\n🆕 New features available:");
    console.log("   - Staking functionality");
    console.log("   - Reward distribution");
    console.log("   - Enhanced tokenomics\n");

    return {
      proxyAddress,
      newImplementationAddress,
      newVersion,
    };
  } catch (error) {
    console.error("❌ Upgrade failed!");
    console.error(error);
    process.exit(1);
  }
}

// Execute upgrade
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
