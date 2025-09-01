# SimBank Token Backend Integration 🏦

Complete backend API for interacting with the deployed SimBank (SB) token on Polygon Amoy testnet.

## Deployed Contract Information

- **Proxy Address**: `0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105`
- **Implementation**: `0x83105510CA955A317bd3AD52DD2239983fb12b8E`
- **Network**: Polygon Amoy Testnet (Chain ID: 80002)
- **Token Symbol**: SB
- **Decimals**: 18

## Quick Start

1. **Install dependencies**:

```bash
cd backend-integration
npm install
# or
yarn install
```

2. **Configure environment**:

```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start the server**:

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server will run on `http://localhost:3000`

## Configuration

### Environment Variables

| Variable           | Description                      | Required        |
| ------------------ | -------------------------------- | --------------- |
| `PORT`             | Server port (default: 3000)      | No              |
| `CONTRACT_ADDRESS` | SimBank token proxy address      | Yes             |
| `RPC_URL`          | Polygon Amoy RPC endpoint        | Yes             |
| `PRIVATE_KEY`      | Private key for write operations | For writes only |

### Private Key Requirements

- Only needed for write operations (mint, transfer, burn, etc.)
- Use a dedicated wallet for backend operations
- Never use your main wallet
- Grant only necessary roles to this wallet

## API Endpoints

### 📖 Read Operations (No Gas Required)

#### Get Token Information

```http
GET /api/token/info
```

Response:

```json
{
  "success": true,
  "data": {
    "name": "SimBank",
    "symbol": "SB",
    "decimals": 18,
    "totalSupply": {
      "wei": "1000000000000000000000000",
      "formatted": "1000000.0"
    },
    "maxSupply": {
      "wei": "1000000000000000000000000000",
      "formatted": "1000000000.0"
    },
    "contractAddress": "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105"
  }
}
```

#### Check Balance

```http
GET /api/balance/:address
```

Example: `GET /api/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7`

Response:

```json
{
  "success": true,
  "data": {
    "wei": "100000000000000000000",
    "formatted": "100.0",
    "symbol": "SB"
  }
}
```

#### Check Allowance

```http
GET /api/allowance/:owner/:spender
```

#### Check Blacklist Status

```http
GET /api/blacklist/:address
```

#### Check Pause Status

```http
GET /api/paused
```

#### Get Transfer Fee

```http
GET /api/fee
```

#### Check Role

```http
GET /api/role/:role/:address
```

Roles: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`, `UPGRADER_ROLE`

### ✍️ Write Operations (Requires Gas & Private Key)

#### Mint Tokens

```http
POST /api/mint
Content-Type: application/json

{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "amount": "100"
}
```

**Requires**: MINTER_ROLE

#### Transfer Tokens

```http
POST /api/transfer
Content-Type: application/json

{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "amount": "10"
}
```

#### Burn Tokens

```http
POST /api/burn
Content-Type: application/json

{
  "amount": "10"
}
```

#### Approve Spending

```http
POST /api/approve
Content-Type: application/json

{
  "spender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "amount": "100"
}
```

#### Pause/Unpause Contract

```http
POST /api/pause
POST /api/unpause
```

**Requires**: PAUSER_ROLE

#### Manage Blacklist

```http
POST /api/blacklist
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

**Requires**: DEFAULT_ADMIN_ROLE

#### Set Transfer Fee

```http
POST /api/fee
Content-Type: application/json

{
  "feePercentage": 100  // 100 = 1%
}
```

**Requires**: DEFAULT_ADMIN_ROLE

#### Grant/Revoke Roles

```http
POST /api/role/grant
POST /api/role/revoke
Content-Type: application/json

{
  "role": "MINTER_ROLE",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

**Requires**: DEFAULT_ADMIN_ROLE

## Using the Service in Your Code

### JavaScript/TypeScript Example

```javascript
const SimBankService = require("./simBankService");

// Initialize service
const simBank = new SimBankService({
  contractAddress: "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105",
  rpcUrl: "https://rpc-amoy.polygon.technology/",
  privateKey: process.env.PRIVATE_KEY, // Optional, for write operations
});

// Check balance
const balance = await simBank.getBalance(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
);
console.log(`Balance: ${balance.formatted} SB`);

// Mint tokens (requires MINTER_ROLE)
const mintResult = await simBank.mint(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "100"
);
console.log(`Minted! TX: ${mintResult.transactionHash}`);

// Transfer tokens
const transferResult = await simBank.transfer(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "10"
);
console.log(`Transferred! TX: ${transferResult.transactionHash}`);
```

### Direct Contract Interaction with ethers.js

```javascript
const { ethers } = require("ethers");
const SimBankABI = require("./abi/SimBankToken.abi.json");

// Setup provider
const provider = new ethers.JsonRpcProvider(
  "https://rpc-amoy.polygon.technology/"
);

// Contract instance (read-only)
const contract = new ethers.Contract(
  "0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105",
  SimBankABI,
  provider
);

// Check balance
const balance = await contract.balanceOf(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
);
console.log("Balance:", ethers.formatEther(balance));

// For write operations, connect a signer
const wallet = new ethers.Wallet(privateKey, provider);
const contractWithSigner = contract.connect(wallet);

// Mint tokens
const tx = await contractWithSigner.mint(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  ethers.parseEther("100")
);
await tx.wait();
```

### Python Example

```python
from web3 import Web3
import json

# Load ABI
with open('abi/SimBankToken.abi.json') as f:
    abi = json.load(f)

# Connect to Polygon Amoy
w3 = Web3(Web3.HTTPProvider('https://rpc-amoy.polygon.technology/'))
contract_address = '0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105'

# Create contract instance
contract = w3.eth.contract(address=contract_address, abi=abi)

# Check balance
address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7'
balance = contract.functions.balanceOf(address).call()
print(f'Balance: {w3.from_wei(balance, "ether")} SB')

# For write operations
account = w3.eth.account.from_key(private_key)
nonce = w3.eth.get_transaction_count(account.address)

# Mint tokens
mint_tx = contract.functions.mint(
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    w3.to_wei(100, 'ether')
).build_transaction({
    'from': account.address,
    'nonce': nonce,
    'gas': 100000,
    'gasPrice': w3.eth.gas_price
})

signed_tx = account.sign_transaction(mint_tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
```

## Role Management

### Available Roles

| Role               | Permissions          | Hash                         |
| ------------------ | -------------------- | ---------------------------- |
| DEFAULT_ADMIN_ROLE | All admin functions  | `0x00...00`                  |
| MINTER_ROLE        | Can mint new tokens  | `keccak256("MINTER_ROLE")`   |
| PAUSER_ROLE        | Can pause/unpause    | `keccak256("PAUSER_ROLE")`   |
| UPGRADER_ROLE      | Can upgrade contract | `keccak256("UPGRADER_ROLE")` |

### Granting Roles

To grant roles to your backend wallet:

1. Using the deployment wallet (that has DEFAULT_ADMIN_ROLE):

```javascript
// Grant MINTER_ROLE to backend wallet
await contract.grantRole(
  ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  backendWalletAddress
);
```

2. Or use the API (if backend wallet has admin role):

```bash
curl -X POST http://localhost:3000/api/role/grant \
  -H "Content-Type: application/json" \
  -d '{"role": "MINTER_ROLE", "address": "0x..."}'
```

## Security Best Practices

1. **Private Key Management**:

   - Never commit private keys to version control
   - Use environment variables or secure key management services
   - Rotate keys regularly
   - Use separate wallets for different environments

2. **Role-Based Access**:

   - Grant minimum necessary permissions
   - Use separate wallets for different roles
   - Regularly audit role assignments

3. **API Security**:

   - Implement authentication (JWT, API keys)
   - Add rate limiting
   - Use HTTPS in production
   - Validate all inputs
   - Implement request signing for sensitive operations

4. **Monitoring**:
   - Monitor wallet balances for gas
   - Track all transactions
   - Set up alerts for unusual activity
   - Log all operations

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:

- `Private key not configured for write operations` - Set PRIVATE_KEY in .env
- `Mint failed: AccessControl...` - Wallet doesn't have MINTER_ROLE
- `Insufficient funds` - Wallet needs POL for gas
- `Invalid Ethereum address` - Check address format

## Testing

Test the API using curl:

```bash
# Get token info
curl http://localhost:3000/api/token/info

# Check balance
curl http://localhost:3000/api/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7

# Mint tokens (requires MINTER_ROLE)
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7", "amount": "100"}'
```

## Deployment Checklist

- [ ] Set up environment variables
- [ ] Fund backend wallet with POL for gas
- [ ] Grant necessary roles to backend wallet
- [ ] Test all endpoints
- [ ] Implement authentication
- [ ] Add rate limiting
- [ ] Set up monitoring
- [ ] Configure HTTPS
- [ ] Set up error logging
- [ ] Document API for frontend team

## Support

For issues or questions about the SimBank token:

- Contract: `0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105`
- Explorer: https://amoy.polygonscan.com/address/0xB2e87bFD20e1a81Dc7f3DAF46df768Fd13489105
- Network: Polygon Amoy Testnet

## License

MIT
