const { ethers } = require("ethers");
const SimBankABI = require("../abi/SimBankToken.abi.json");

/**
 * SimBank Token Service
 * Handles all interactions with the deployed SimBank token contract
 */
class SimBankService {
  constructor(config) {
    // Your deployed contract address on Polygon Amoy
    this.contractAddress =
      config.contractAddress || "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105";

    // Initialize provider (you can also use Alchemy, Infura, etc.)
    this.provider = new ethers.JsonRpcProvider(
      config.rpcUrl || "https://rpc-amoy.polygon.technology/"
    );

    // Initialize contract for read-only operations
    this.contract = new ethers.Contract(
      this.contractAddress,
      SimBankABI,
      this.provider
    );

    // Initialize wallet for write operations (if private key provided)
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
      this.contractWithSigner = new ethers.Contract(
        this.contractAddress,
        SimBankABI,
        this.wallet
      );
    }

    // Cache role hashes
    this.roles = {
      DEFAULT_ADMIN_ROLE:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
      PAUSER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE")),
      UPGRADER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE")),
    };
  }

  // ============= READ FUNCTIONS (No gas required) =============

  /**
   * Get token balance for an address
   * @param {string} address - Wallet address to check
   * @returns {object} Balance in wei and formatted
   */
  async getBalance(address) {
    try {
      const balance = await this.contract.balanceOf(address);
      return {
        wei: balance.toString(),
        formatted: ethers.formatEther(balance),
        symbol: "SB",
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo() {
    try {
      const [name, symbol, decimals, totalSupply, maxSupply] =
        await Promise.all([
          this.contract.name(),
          this.contract.symbol(),
          this.contract.decimals(),
          this.contract.totalSupply(),
          this.contract.MAX_SUPPLY(),
        ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: {
          wei: totalSupply.toString(),
          formatted: ethers.formatEther(totalSupply),
        },
        maxSupply: {
          wei: maxSupply.toString(),
          formatted: ethers.formatEther(maxSupply),
        },
        contractAddress: this.contractAddress,
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  /**
   * Check if address is blacklisted
   */
  async isBlacklisted(address) {
    try {
      return await this.contract.blacklisted(address);
    } catch (error) {
      throw new Error(`Failed to check blacklist status: ${error.message}`);
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused() {
    try {
      return await this.contract.paused();
    } catch (error) {
      throw new Error(`Failed to check pause status: ${error.message}`);
    }
  }

  /**
   * Get transfer fee percentage
   */
  async getTransferFee() {
    try {
      const fee = await this.contract.transferFeePercentage();
      return {
        basisPoints: Number(fee),
        percentage: Number(fee) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to get transfer fee: ${error.message}`);
    }
  }

  /**
   * Check if address has a specific role
   */
  async hasRole(role, address) {
    try {
      const roleHash = this.roles[role] || role;
      return await this.contract.hasRole(roleHash, address);
    } catch (error) {
      throw new Error(`Failed to check role: ${error.message}`);
    }
  }

  /**
   * Get allowance between owner and spender
   */
  async getAllowance(owner, spender) {
    try {
      const allowance = await this.contract.allowance(owner, spender);
      return {
        wei: allowance.toString(),
        formatted: ethers.formatEther(allowance),
      };
    } catch (error) {
      throw new Error(`Failed to get allowance: ${error.message}`);
    }
  }

  // ============= WRITE FUNCTIONS (Requires gas and private key) =============

  /**
   * Mint new tokens (requires MINTER_ROLE)
   * @param {string} to - Address to mint tokens to
   * @param {string} amount - Amount in ether (will be converted to wei)
   */
  async mint(to, amount) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contractWithSigner.mint(to, amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        to,
        amount,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Mint failed: ${error.message}`);
    }
  }

  /**
   * Transfer tokens
   */
  async transfer(to, amount) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contractWithSigner.transfer(to, amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        to,
        amount,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Burn tokens
   */
  async burn(amount) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contractWithSigner.burn(amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        amount,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Burn failed: ${error.message}`);
    }
  }

  /**
   * Pause token transfers (requires PAUSER_ROLE)
   */
  async pause() {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const tx = await this.contractWithSigner.pause();
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Pause failed: ${error.message}`);
    }
  }

  /**
   * Unpause token transfers (requires PAUSER_ROLE)
   */
  async unpause() {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const tx = await this.contractWithSigner.unpause();
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Unpause failed: ${error.message}`);
    }
  }

  /**
   * Blacklist an address (requires DEFAULT_ADMIN_ROLE)
   */
  async blacklist(address) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const tx = await this.contractWithSigner.blacklist(address);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        address,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Blacklist failed: ${error.message}`);
    }
  }

  /**
   * Unblacklist an address (requires DEFAULT_ADMIN_ROLE)
   */
  async unblacklist(address) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const tx = await this.contractWithSigner.unblacklist(address);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        address,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Unblacklist failed: ${error.message}`);
    }
  }

  /**
   * Set transfer fee (requires DEFAULT_ADMIN_ROLE)
   * @param {number} feePercentage - Fee in basis points (100 = 1%)
   */
  async setTransferFee(feePercentage) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const tx = await this.contractWithSigner.setTransferFee(feePercentage);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        newFee: feePercentage,
        percentage: feePercentage / 100,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Set transfer fee failed: ${error.message}`);
    }
  }

  /**
   * Grant role to an address (requires DEFAULT_ADMIN_ROLE)
   */
  async grantRole(role, address) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const roleHash = this.roles[role] || role;
      const tx = await this.contractWithSigner.grantRole(roleHash, address);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        role,
        address,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Grant role failed: ${error.message}`);
    }
  }

  /**
   * Revoke role from an address (requires DEFAULT_ADMIN_ROLE)
   */
  async revokeRole(role, address) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const roleHash = this.roles[role] || role;
      const tx = await this.contractWithSigner.revokeRole(roleHash, address);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        role,
        address,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Revoke role failed: ${error.message}`);
    }
  }

  /**
   * Approve spending
   */
  async approve(spender, amount) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured for write operations");
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contractWithSigner.approve(spender, amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        spender,
        amount,
        explorer: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      };
    } catch (error) {
      throw new Error(`Approve failed: ${error.message}`);
    }
  }

  // ============= UTILITY FUNCTIONS =============

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(method, params) {
    if (!this.contractWithSigner) {
      throw new Error("Private key not configured");
    }

    try {
      const gas = await this.contractWithSigner[method].estimateGas(...params);
      return {
        gasLimit: gas.toString(),
        formatted: ethers.formatUnits(gas, "gwei"),
      };
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getFeeData();
      return {
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash, confirmations = 1) {
    try {
      const receipt = await this.provider.waitForTransaction(
        txHash,
        confirmations
      );
      return {
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        logs: receipt.logs,
      };
    } catch (error) {
      throw new Error(`Transaction wait failed: ${error.message}`);
    }
  }
}

module.exports = SimBankService;
