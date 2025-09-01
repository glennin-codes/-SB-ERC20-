/**
 * Example client for SimBank Token API
 * Demonstrates how to interact with the deployed token
 */

const axios = require("axios");

// API Configuration
const API_BASE_URL = "http://localhost:3000/api";

// Your deployed contract on Polygon Amoy
const CONTRACT_ADDRESS = "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105";

class SimBankClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ========== READ METHODS ==========

  async getTokenInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/token/info`);
      return response.data;
    } catch (error) {
      console.error(
        "Error getting token info:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getBalance(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/balance/${address}`);
      return response.data;
    } catch (error) {
      console.error(
        "Error getting balance:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async checkIfBlacklisted(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/blacklist/${address}`);
      return response.data;
    } catch (error) {
      console.error(
        "Error checking blacklist:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async isPaused() {
    try {
      const response = await axios.get(`${this.baseUrl}/paused`);
      return response.data;
    } catch (error) {
      console.error(
        "Error checking pause status:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getTransferFee() {
    try {
      const response = await axios.get(`${this.baseUrl}/fee`);
      return response.data;
    } catch (error) {
      console.error(
        "Error getting transfer fee:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async checkRole(role, address) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/role/${role}/${address}`
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error checking role:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // ========== WRITE METHODS ==========

  async mint(to, amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/mint`, { to, amount });
      return response.data;
    } catch (error) {
      console.error(
        "Error minting tokens:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async transfer(to, amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/transfer`, {
        to,
        amount,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error transferring tokens:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async burn(amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/burn`, { amount });
      return response.data;
    } catch (error) {
      console.error(
        "Error burning tokens:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async approve(spender, amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/approve`, {
        spender,
        amount,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error approving tokens:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async pause() {
    try {
      const response = await axios.post(`${this.baseUrl}/pause`);
      return response.data;
    } catch (error) {
      console.error(
        "Error pausing contract:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async unpause() {
    try {
      const response = await axios.post(`${this.baseUrl}/unpause`);
      return response.data;
    } catch (error) {
      console.error(
        "Error unpausing contract:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async blacklist(address) {
    try {
      const response = await axios.post(`${this.baseUrl}/blacklist`, {
        address,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error blacklisting address:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async unblacklist(address) {
    try {
      const response = await axios.post(`${this.baseUrl}/unblacklist`, {
        address,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error unblacklisting address:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async setTransferFee(feePercentage) {
    try {
      const response = await axios.post(`${this.baseUrl}/fee`, {
        feePercentage,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error setting transfer fee:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async grantRole(role, address) {
    try {
      const response = await axios.post(`${this.baseUrl}/role/grant`, {
        role,
        address,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error granting role:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async revokeRole(role, address) {
    try {
      const response = await axios.post(`${this.baseUrl}/role/revoke`, {
        role,
        address,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Error revoking role:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

// ========== EXAMPLE USAGE ==========

async function main() {
  const client = new SimBankClient();

  console.log("🏦 SimBank Token API Client Example\n");
  console.log("====================================\n");

  try {
    // 1. Get token information
    console.log("📊 Token Information:");
    const tokenInfo = await client.getTokenInfo();
    console.log(`   Name: ${tokenInfo.data.name}`);
    console.log(`   Symbol: ${tokenInfo.data.symbol}`);
    console.log(`   Total Supply: ${tokenInfo.data.totalSupply.formatted} SB`);
    console.log(`   Max Supply: ${tokenInfo.data.maxSupply.formatted} SB`);
    console.log(`   Contract: ${tokenInfo.data.contractAddress}\n`);

    // 2. Check a balance (use your address or any address)
    const testAddress = "0x6b574FBE7b40f2fd8FB1b276f09BC5a86fBc3D83"; // Example address
    console.log(`💰 Balance Check for ${testAddress}:`);
    const balance = await client.getBalance(testAddress);
    console.log(
      `   Balance: ${balance.data.formatted} ${balance.data.symbol}\n`
    );

    // 3. Check contract status
    console.log("🔍 Contract Status:");
    const pauseStatus = await client.isPaused();
    console.log(`   Is Paused: ${pauseStatus.data.isPaused}`);

    const feeInfo = await client.getTransferFee();
    console.log(`   Transfer Fee: ${feeInfo.data.percentage}%\n`);

    // 4. Check roles (example)
    console.log("👤 Role Check:");
    const hasMinterRole = await client.checkRole("MINTER_ROLE", testAddress);
    console.log(
      `   ${testAddress} has MINTER_ROLE: ${hasMinterRole.data.hasRole}\n`
    );

    // ========== WRITE OPERATIONS (Uncomment to test - requires private key in backend) ==========

    // // Mint tokens (requires MINTER_ROLE)
    // console.log('🪙 Minting 100 SB tokens...');
    // const mintResult = await client.mint(testAddress, '100');
    // console.log(`   Success! TX: ${mintResult.data.transactionHash}`);
    // console.log(`   Explorer: ${mintResult.data.explorer}\n`);

    // // Transfer tokens
    // console.log('💸 Transferring 10 SB tokens...');
    // const transferResult = await client.transfer('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7', '10');
    // console.log(`   Success! TX: ${transferResult.data.transactionHash}\n`);

    // // Set transfer fee (requires DEFAULT_ADMIN_ROLE)
    // console.log('💵 Setting transfer fee to 1%...');
    // const feeResult = await client.setTransferFee(100); // 100 basis points = 1%
    // console.log(`   Success! New fee: ${feeResult.data.percentage}%\n`);

    console.log("✅ Example completed successfully!");
    console.log("\n====================================");
    console.log("📝 Note: Write operations are commented out.");
    console.log("   To test them, ensure:");
    console.log("   1. Backend has PRIVATE_KEY configured");
    console.log("   2. Wallet has necessary roles");
    console.log("   3. Wallet has POL for gas fees");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response?.data) {
      console.error("   Details:", error.response.data);
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimBankClient;
