# SimBank Token (SB) 🏦

An upgradeable ERC20 token built with Hardhat and OpenZeppelin, supporting multiple blockchain networks including Polygon and Berachain.

## Features ✨

### Core Token Features

- **ERC20 Standard** - Full ERC20 compatibility
- **Upgradeable** - UUPS proxy pattern for seamless upgrades
- **Burnable** - Users can burn their tokens
- **Mintable** - Controlled minting with role-based access
- **Pausable** - Emergency pause functionality
- **Permit (EIP-2612)** - Gasless approvals
- **Blacklist** - Admin-controlled address blacklisting
- **Transfer Fees** - Optional transfer fee mechanism
- **Max Supply Cap** - 1 billion token maximum supply

### V2 Features (Upgrade Example)

- **Staking** - Stake tokens to earn rewards
- **Reward Distribution** - Automatic reward calculation
- **Configurable APY** - Admin-adjustable staking rewards

### Access Control Roles

- **DEFAULT_ADMIN_ROLE** - Full administrative control
- **MINTER_ROLE** - Can mint new tokens
- **PAUSER_ROLE** - Can pause/unpause transfers
- **UPGRADER_ROLE** - Can upgrade the contract

## Supported Networks 🌐

| Network                  | Chain ID | Status         | Explorer                                         |
| ------------------------ | -------- | -------------- | ------------------------------------------------ |
| Polygon Mainnet          | 137      | ✅ Ready       | [PolygonScan](https://polygonscan.com)           |
| Polygon Amoy Testnet     | 80002    | ✅ Ready       | [Amoy PolygonScan](https://amoy.polygonscan.com) |
| Berachain bArtio Testnet | 80084    | ✅ Ready       | [Beratrail](https://bartio.beratrail.io)         |
| Berachain Mainnet        | TBD      | 🚧 Coming Soon | TBD                                              |

## Prerequisites 📋

- Node.js v16 or higher
- Yarn package manager
- Git

## Installation 🚀

1. Clone the repository:

```bash
git clone <your-repo-url>
cd tokenLaunch
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:

```env
# CRITICAL: Use a new private key, never use one with real funds for testing
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional - defaults provided)
POLYGON_RPC_URL=https://polygon-rpc.com/
BERACHAIN_RPC_URL=https://rpc.berachain.com/

# For contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BERACHAIN_API_KEY=your_berachain_api_key

# Token configuration
INITIAL_SUPPLY=1000000  # 1 million tokens
TOKEN_NAME=SimBank
TOKEN_SYMBOL=SB
```

## Usage 📖

### Compile Contracts

```bash
yarn compile
```

### Run Tests

```bash
yarn test

# With coverage report
yarn test:coverage
```

### Deploy Token

#### Local Hardhat Network

```bash
yarn deploy:hardhat
```

#### Polygon Amoy Testnet

```bash
yarn deploy:polygonAmoy
```

#### Polygon Mainnet

```bash
yarn deploy:polygon
```

#### Berachain bArtio Testnet

```bash
yarn deploy:berachainTestnet
```

### Upgrade Token

After initial deployment, you can upgrade to V2:

```bash
# Upgrade on respective network
yarn upgrade:polygonAmoy
yarn upgrade:polygon
yarn upgrade:berachainTestnet
```

### Verify Contract

After deployment, verify your contract on block explorers:

```bash
npx hardhat verify --network <network-name> <implementation-address>
```

## Contract Addresses 📍

After deployment, contract addresses are saved in `deployments/deployment-<chainId>.json`

Example structure:

```json
{
  "network": "polygon",
  "chainId": "137",
  "proxyAddress": "0x...",
  "implementationAddress": "0x...",
  "adminAddress": "0x...",
  "deployer": "0x...",
  "initialSupply": "1000000",
  "deploymentDate": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Token Functions 🔧

### Basic Operations

```solidity
// Transfer tokens
transfer(address to, uint256 amount)

// Approve spending
approve(address spender, uint256 amount)

// Transfer from approved address
transferFrom(address from, address to, uint256 amount)

// Burn tokens
burn(uint256 amount)
burnFrom(address account, uint256 amount)
```

### Admin Functions

```solidity
// Mint new tokens (MINTER_ROLE required)
mint(address to, uint256 amount)

// Pause transfers (PAUSER_ROLE required)
pause()
unpause()

// Blacklist management (ADMIN_ROLE required)
blacklist(address account)
unblacklist(address account)

// Fee configuration (ADMIN_ROLE required)
setTransferFee(uint256 feePercentage)  // In basis points (100 = 1%)
setFeeRecipient(address recipient)

// Role management (ADMIN_ROLE required)
grantRole(bytes32 role, address account)
revokeRole(bytes32 role, address account)
```

### V2 Staking Functions

```solidity
// Stake tokens
stake(uint256 amount)

// Unstake and claim rewards
unstake(uint256 amount)

// View pending rewards
pendingRewards(address user)

// Admin: Set staking reward rate
setStakingRewardRate(uint256 rate)  // In basis points per day
```

## Testing Guide 🧪

The project includes comprehensive test suites:

1. **Basic Token Tests** (`test/SimBankToken.test.js`)

   - Deployment and initialization
   - Transfer operations
   - Minting and burning
   - Pausing functionality
   - Blacklist features
   - Transfer fees
   - Access control
   - Permit functionality

2. **Upgrade Tests** (`test/SimBankTokenUpgrade.test.js`)
   - Upgrade process
   - State preservation
   - V2 features (staking)
   - Backward compatibility

Run specific test files:

```bash
npx hardhat test test/SimBankToken.test.js
npx hardhat test test/SimBankTokenUpgrade.test.js
```

## Security Considerations 🔒

1. **Private Keys**: Never commit private keys to version control
2. **Upgrades**: Only accounts with UPGRADER_ROLE can upgrade contracts
3. **Admin Powers**: Admin role has significant powers - use multi-sig wallets in production
4. **Auditing**: Consider professional auditing before mainnet deployment
5. **Testing**: Thoroughly test on testnets before mainnet deployment

## Gas Optimization ⛽

The contracts are optimized with:

- Optimizer enabled (200 runs)
- Efficient storage patterns
- Minimal external calls
- Batch operations where possible

## Troubleshooting 🔧

### Common Issues

1. **"Insufficient funds" error**

   - Ensure your wallet has enough native tokens for gas
   - Check the correct network is selected

2. **"Nonce too high" error**

   - Reset account in MetaMask: Settings → Advanced → Reset Account

3. **Verification fails**

   - Ensure you're verifying the implementation address, not proxy
   - API key must be valid for the network

4. **Upgrade fails**
   - Ensure deployer has UPGRADER_ROLE
   - Check proxy address is correct

## Development Roadmap 🗺️

- [x] V1: Basic upgradeable ERC20
- [x] V2: Staking functionality
- [ ] V3: Governance features
- [ ] V4: Cross-chain bridge support
- [ ] V5: Advanced DeFi integrations

## Resources 📚

- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Polygon Documentation](https://docs.polygon.technology/)
- [Berachain Documentation](https://docs.berachain.com/)

## License 📄

MIT License - see LICENSE file for details

## Support 💬

For issues and questions:

1. Check the [Troubleshooting](#troubleshooting-) section
2. Review existing issues on GitHub
3. Create a new issue with detailed information

## Disclaimer ⚠️

This is experimental software. Use at your own risk. Always test thoroughly on testnets before deploying to mainnet.

---

**Built with ❤️ using Hardhat and OpenZeppelin**
