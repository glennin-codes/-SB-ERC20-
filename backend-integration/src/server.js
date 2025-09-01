const express = require("express");
const cors = require("cors");
const SimBankService = require("./simBankService");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SimBank Service
const simBankService = new SimBankService({
  contractAddress:
    process.env.CONTRACT_ADDRESS ||
    "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105",
  rpcUrl: process.env.RPC_URL || "https://rpc-amoy.polygon.technology/",
  privateKey: process.env.PRIVATE_KEY, // Only needed for write operations
});

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== READ ENDPOINTS ====================

/**
 * GET /api/token/info
 * Get token information
 */
app.get(
  "/api/token/info",
  asyncHandler(async (req, res) => {
    const info = await simBankService.getTokenInfo();
    res.json({
      success: true,
      data: info,
    });
  })
);

/**
 * GET /api/balance/:address
 * Get SB token balance for an address
 */
app.get(
  "/api/balance/:address",
  asyncHandler(async (req, res) => {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address",
      });
    }

    const balance = await simBankService.getBalance(address);
    res.json({
      success: true,
      data: balance,
    });
  })
);

/**
 * GET /api/allowance/:owner/:spender
 * Get allowance between owner and spender
 */
app.get(
  "/api/allowance/:owner/:spender",
  asyncHandler(async (req, res) => {
    const { owner, spender } = req.params;

    const allowance = await simBankService.getAllowance(owner, spender);
    res.json({
      success: true,
      data: allowance,
    });
  })
);

/**
 * GET /api/blacklist/:address
 * Check if address is blacklisted
 */
app.get(
  "/api/blacklist/:address",
  asyncHandler(async (req, res) => {
    const { address } = req.params;

    const isBlacklisted = await simBankService.isBlacklisted(address);
    res.json({
      success: true,
      data: {
        address,
        isBlacklisted,
      },
    });
  })
);

/**
 * GET /api/paused
 * Check if contract is paused
 */
app.get(
  "/api/paused",
  asyncHandler(async (req, res) => {
    const isPaused = await simBankService.isPaused();
    res.json({
      success: true,
      data: {
        isPaused,
      },
    });
  })
);

/**
 * GET /api/fee
 * Get current transfer fee
 */
app.get(
  "/api/fee",
  asyncHandler(async (req, res) => {
    const fee = await simBankService.getTransferFee();
    res.json({
      success: true,
      data: fee,
    });
  })
);

/**
 * GET /api/role/:role/:address
 * Check if address has a specific role
 */
app.get(
  "/api/role/:role/:address",
  asyncHandler(async (req, res) => {
    const { role, address } = req.params;

    const hasRole = await simBankService.hasRole(role, address);
    res.json({
      success: true,
      data: {
        role,
        address,
        hasRole,
      },
    });
  })
);

/**
 * GET /api/gas
 * Get current gas prices
 */
app.get(
  "/api/gas",
  asyncHandler(async (req, res) => {
    const gasPrice = await simBankService.getGasPrice();
    res.json({
      success: true,
      data: gasPrice,
    });
  })
);

// ==================== WRITE ENDPOINTS ====================

/**
 * POST /api/mint
 * Mint new tokens (requires MINTER_ROLE)
 * Body: { to: "0x...", amount: "100" }
 */
app.post(
  "/api/mint",
  asyncHandler(async (req, res) => {
    const { to, amount } = req.body;

    if (!to || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, amount",
      });
    }

    const result = await simBankService.mint(to, amount);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/transfer
 * Transfer tokens
 * Body: { to: "0x...", amount: "100" }
 */
app.post(
  "/api/transfer",
  asyncHandler(async (req, res) => {
    const { to, amount } = req.body;

    if (!to || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, amount",
      });
    }

    const result = await simBankService.transfer(to, amount);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/burn
 * Burn tokens
 * Body: { amount: "100" }
 */
app.post(
  "/api/burn",
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: amount",
      });
    }

    const result = await simBankService.burn(amount);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/approve
 * Approve spending
 * Body: { spender: "0x...", amount: "100" }
 */
app.post(
  "/api/approve",
  asyncHandler(async (req, res) => {
    const { spender, amount } = req.body;

    if (!spender || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: spender, amount",
      });
    }

    const result = await simBankService.approve(spender, amount);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/pause
 * Pause contract (requires PAUSER_ROLE)
 */
app.post(
  "/api/pause",
  asyncHandler(async (req, res) => {
    const result = await simBankService.pause();
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/unpause
 * Unpause contract (requires PAUSER_ROLE)
 */
app.post(
  "/api/unpause",
  asyncHandler(async (req, res) => {
    const result = await simBankService.unpause();
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/blacklist
 * Blacklist an address (requires DEFAULT_ADMIN_ROLE)
 * Body: { address: "0x..." }
 */
app.post(
  "/api/blacklist",
  asyncHandler(async (req, res) => {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: address",
      });
    }

    const result = await simBankService.blacklist(address);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/unblacklist
 * Unblacklist an address (requires DEFAULT_ADMIN_ROLE)
 * Body: { address: "0x..." }
 */
app.post(
  "/api/unblacklist",
  asyncHandler(async (req, res) => {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: address",
      });
    }

    const result = await simBankService.unblacklist(address);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/fee
 * Set transfer fee (requires DEFAULT_ADMIN_ROLE)
 * Body: { feePercentage: 100 } // 100 = 1%
 */
app.post(
  "/api/fee",
  asyncHandler(async (req, res) => {
    const { feePercentage } = req.body;

    if (feePercentage === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: feePercentage",
      });
    }

    const result = await simBankService.setTransferFee(feePercentage);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/role/grant
 * Grant role to address (requires DEFAULT_ADMIN_ROLE)
 * Body: { role: "MINTER_ROLE", address: "0x..." }
 */
app.post(
  "/api/role/grant",
  asyncHandler(async (req, res) => {
    const { role, address } = req.body;

    if (!role || !address) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: role, address",
      });
    }

    const result = await simBankService.grantRole(role, address);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/role/revoke
 * Revoke role from address (requires DEFAULT_ADMIN_ROLE)
 * Body: { role: "MINTER_ROLE", address: "0x..." }
 */
app.post(
  "/api/role/revoke",
  asyncHandler(async (req, res) => {
    const { role, address } = req.body;

    if (!role || !address) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: role, address",
      });
    }

    const result = await simBankService.revokeRole(role, address);
    res.json({
      success: true,
      data: result,
    });
  })
);

// ==================== UTILITY ENDPOINTS ====================

/**
 * POST /api/estimate
 * Estimate gas for a transaction
 * Body: { method: "mint", params: ["0x...", "100"] }
 */
app.post(
  "/api/estimate",
  asyncHandler(async (req, res) => {
    const { method, params } = req.body;

    if (!method || !params) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: method, params",
      });
    }

    const gas = await simBankService.estimateGas(method, params);
    res.json({
      success: true,
      data: gas,
    });
  })
);

/**
 * GET /api/transaction/:hash
 * Wait for and get transaction receipt
 */
app.get(
  "/api/transaction/:hash",
  asyncHandler(async (req, res) => {
    const { hash } = req.params;
    const confirmations = req.query.confirmations || 1;

    const receipt = await simBankService.waitForTransaction(
      hash,
      confirmations
    );
    res.json({
      success: true,
      data: receipt,
    });
  })
);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 SimBank Token API Server Running
====================================
Port: ${PORT}
Contract: ${simBankService.contractAddress}
Network: Polygon Amoy Testnet
====================================

Available Endpoints:

READ (No gas required):
  GET  /api/token/info          - Get token information
  GET  /api/balance/:address    - Get SB balance for address
  GET  /api/allowance/:owner/:spender - Get allowance
  GET  /api/blacklist/:address  - Check if blacklisted
  GET  /api/paused              - Check if paused
  GET  /api/fee                 - Get transfer fee
  GET  /api/role/:role/:address - Check role
  GET  /api/gas                 - Get gas prices

WRITE (Requires gas & private key):
  POST /api/mint                - Mint tokens
  POST /api/transfer            - Transfer tokens
  POST /api/burn                - Burn tokens
  POST /api/approve             - Approve spending
  POST /api/pause               - Pause transfers
  POST /api/unpause             - Unpause transfers
  POST /api/blacklist           - Blacklist address
  POST /api/unblacklist         - Unblacklist address
  POST /api/fee                 - Set transfer fee
  POST /api/role/grant          - Grant role
  POST /api/role/revoke         - Revoke role

UTILITY:
  POST /api/estimate            - Estimate gas
  GET  /api/transaction/:hash   - Get transaction receipt
  `);
});
