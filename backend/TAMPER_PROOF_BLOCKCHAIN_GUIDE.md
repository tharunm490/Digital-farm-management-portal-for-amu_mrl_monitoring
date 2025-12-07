# Tamper-Proof Logging System with Blockchain Integration

This system provides **immutable record verification** for critical farm management data by storing cryptographic hashes both in MySQL and on the Ethereum Sepolia blockchain.

---

## 🎯 Overview

### What This Does

For important records (treatments, AMU, vaccinations, distributor verifications, loans), the system:

1. **Creates a canonical string** from key fields in a fixed order
2. **Hashes** that string using Keccak256
3. **Stores the hash** in:
   - MySQL table `tamper_proof_log`
   - Ethereum blockchain via `TamperProofLog` smart contract
4. **Verifies integrity** by recomputing and comparing hashes

### Why This Matters

- **Data Integrity**: Detect any tampering with critical records
- **Audit Trail**: Immutable blockchain record of data states
- **Compliance**: Meet regulatory requirements for data authenticity
- **Trust**: Provide verifiable proof of record integrity

---

## 📦 Files Created

### Backend (JavaScript)

```
backend/
├── utils/
│   ├── tamperProofService.js    # Core hashing & logging logic
│   └── blockchain.js             # Ethereum contract interaction
├── routes/
│   └── tamperProofRoutes.js     # API endpoints for all entity types
├── contracts/
│   └── TamperProofLog.sol       # Solidity smart contract
└── .env.blockchain.example      # Environment variables template
```

### Key Functions

**tamperProofService.js**:

- `buildCanonicalString(entityType, data)` - Creates consistent string representation
- `hashCanonicalString(canonical)` - Generates Keccak256 hash
- `logTamperProof(entityType, entityId, canonical)` - Stores hash in DB + blockchain
- `verifyTamperProof(entityType, entityId, currentData)` - Validates integrity

**blockchain.js**:

- `getTamperProofContract()` - Returns ethers.js contract instance
- `storeTamperProofOnChain(recordHash)` - Writes hash to blockchain
- `getTamperProofFromChain(blockchainId)` - Reads hash from blockchain

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install ethers
```

The `package.json` has been updated to include `ethers@^6.13.0`.

### 2. Deploy Smart Contract

#### Option A: Using Remix IDE (Easiest)

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create new file `TamperProofLog.sol`
3. Copy contents from `backend/contracts/TamperProofLog.sol`
4. Compile with Solidity 0.8.18+
5. Deploy to **Sepolia Testnet**:
   - Install MetaMask
   - Switch to Sepolia network
   - Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Deploy contract
6. Copy deployed contract address

#### Option B: Using Hardhat

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Copy TamperProofLog.sol to contracts/
# Deploy using hardhat deploy script
```

### 3. Configure Environment Variables

1. Copy the example file:

   ```bash
   cp .env.blockchain.example .env
   ```

2. Edit `.env` and add:

   ```env
   # Get from Infura or Alchemy
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

   # Your wallet private key (needs Sepolia ETH for gas)
   WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

   # Contract address from deployment
   TAMPER_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
   ```

3. **Security**: Never commit `.env` file! Add to `.gitignore`.

### 4. Get Sepolia ETH

Your wallet needs Sepolia ETH for gas fees:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

---

## 📖 API Usage

All routes are prefixed with `/api/tamper-proof`.

### Treatment Records

**Create Treatment with Tamper-Proof Log**:

```http
POST /api/tamper-proof/treatment
Content-Type: application/json

{
  "entity_id": 1,
  "farm_id": 1,
  "user_id": 5,
  "species": "cattle",
  "medication_type": "Antibiotic",
  "medicine": "Penicillin",
  "route": "IM",
  "dose_amount": 10,
  "dose_unit": "ml",
  "frequency_per_day": 2,
  "duration_days": 5,
  "start_date": "2025-12-01",
  "end_date": "2025-12-05",
  "status": "approved"
}
```

**Response**:

```json
{
  "success": true,
  "treatment_id": 123,
  "tamper_proof": {
    "dbLogId": 456,
    "blockchainId": 789,
    "txHash": "0xabc123...",
    "recordHash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
  }
}
```

**Verify Treatment Integrity**:

```http
GET /api/tamper-proof/treatment/123/verify
```

**Response**:

```json
{
  "success": true,
  "verification": {
    "isDbIntact": true,
    "currentHash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "loggedHash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "message": "Record integrity verified ✓"
  }
}
```

### AMU Records

```http
POST /api/tamper-proof/amu
GET /api/tamper-proof/amu/:id/verify
```

### Vaccination History

```http
POST /api/tamper-proof/vaccination
GET /api/tamper-proof/vaccination/:id/verify
```

### Distributor Verification Logs

```http
POST /api/tamper-proof/distributor-verification
GET /api/tamper-proof/distributor-verification/:id/verify
```

### Loan Requests

```http
POST /api/tamper-proof/loan
GET /api/tamper-proof/loan/:id/verify
```

---

## 🔐 How Canonical Strings Work

Each entity type has a **fixed format** to ensure consistent hashing:

### Treatment Record

```
TR|{treatment_id}|{entity_id}|{farm_id}|{user_id}|{species}|{medication_type}|{medicine}|{route}|{dose_amount}|{dose_unit}|{frequency_per_day}|{duration_days}|{start_date}|{end_date}|{status}
```

### AMU Record

```
AMU|{amu_id}|{treatment_id}|{entity_id}|{farm_id}|{user_id}|{species}|{medication_type}|{matrix}|{medicine}|{dose_amount}|{dose_unit}|{frequency_per_day}|{duration_days}|{start_date}|{end_date}|{predicted_mrl}|{predicted_withdrawal_days}|{safe_date}|{risk_percent}|{overdosage}|{risk_category}|{worst_tissue}|{model_version}
```

### Vaccination History

```
VH|{vacc_id}|{entity_id}|{treatment_id}|{vaccine_name}|{given_date}|{next_due_date}|{interval_days}|{vaccine_total_months}|{vaccine_end_date}
```

### Distributor Verification

```
DVL|{log_id}|{distributor_id}|{qr_id}|{entity_id}|{verification_status}|{is_withdrawal_safe}|{safe_date}|{reason}|{scanned_at}
```

### Loan Request

```
LOAN|{loan_id}|{farmer_id}|{farm_id}|{purpose}|{amount_requested}|{status}|{created_at}|{action_by}|{action_date}|{authority_department}|{authority_designation}
```

---

## 🧪 Testing

### Manual Test with curl

```bash
# Create a treatment record
curl -X POST http://localhost:5000/api/tamper-proof/treatment \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": 1,
    "farm_id": 1,
    "user_id": 5,
    "species": "cattle",
    "medication_type": "Antibiotic",
    "medicine": "Penicillin",
    "route": "IM",
    "dose_amount": 10,
    "dose_unit": "ml",
    "frequency_per_day": 2,
    "duration_days": 5,
    "start_date": "2025-12-01",
    "end_date": "2025-12-05",
    "status": "approved"
  }'

# Verify the record (replace 123 with actual ID)
curl http://localhost:5000/api/tamper-proof/treatment/123/verify
```

### Check Blockchain Transaction

After creating a record, you'll get a `txHash`. View it on Etherscan:

```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

---

## 🛠️ Integration with Existing Routes

You can integrate tamper-proof logging into your **existing routes**:

```javascript
// In routes/treatmentRoutes.js
const { buildCanonicalString, logTamperProof, ENTITY_TYPES } = require('../utils/tamperProofService');

router.post('/', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Your existing treatment creation code
    const [result] = await connection.execute(
      'INSERT INTO treatment_records ...',
      [...]
    );

    const treatmentId = result.insertId;

    // Get inserted record
    const [rows] = await connection.execute(
      'SELECT * FROM treatment_records WHERE treatment_id = ?',
      [treatmentId]
    );

    // Add tamper-proof logging
    const canonical = buildCanonicalString(ENTITY_TYPES.TREATMENT, rows[0]);
    const tamperProof = await logTamperProof(ENTITY_TYPES.TREATMENT, treatmentId, canonical);

    await connection.commit();

    res.json({
      treatment_id: treatmentId,
      tamper_proof: tamperProof  // Include in response
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
```

---

## 📊 Database Schema

The `tamper_proof_log` table is already in your schema:

```sql
CREATE TABLE tamper_proof_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    record_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Optional enhancement - add blockchain tracking:

```sql
ALTER TABLE tamper_proof_log
ADD COLUMN blockchain_id INT,
ADD COLUMN tx_hash VARCHAR(66);
```

---

## 🔍 Troubleshooting

### "Missing blockchain configuration" Error

**Problem**: Environment variables not loaded.

**Solution**:

1. Ensure `.env` file exists in `backend/` directory
2. Verify all three variables are set:
   - `SEPOLIA_RPC_URL`
   - `WALLET_PRIVATE_KEY`
   - `TAMPER_CONTRACT_ADDRESS`
3. Restart the server

### "Insufficient funds" Error

**Problem**: Wallet has no Sepolia ETH for gas.

**Solution**: Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

### "Contract not deployed" Error

**Problem**: Contract address is invalid or contract not deployed.

**Solution**:

1. Deploy contract using Remix
2. Copy exact contract address (starts with `0x`)
3. Update `TAMPER_CONTRACT_ADDRESS` in `.env`

### Hash Mismatch on Verification

**Problem**: `isDbIntact: false` means record was modified.

**Investigation**:

1. Check if the record was updated after tamper-proof log created
2. Verify canonical string format matches exactly
3. Check for null/undefined values in fields

---

## 🔐 Security Best Practices

1. **Never commit `.env`**: Add to `.gitignore`
2. **Use dedicated wallet**: Create separate wallet for blockchain operations
3. **Limit wallet funds**: Only keep small amount of Sepolia ETH needed for gas
4. **Rotate keys**: Periodically change private keys
5. **Monitor transactions**: Set up alerts for unexpected blockchain activity
6. **Backup logs**: Regularly backup `tamper_proof_log` table

---

## 📈 Production Deployment

### Switch to Mainnet

1. Change `SEPOLIA_RPC_URL` to Ethereum mainnet RPC
2. Deploy contract to mainnet (requires real ETH)
3. Update `TAMPER_CONTRACT_ADDRESS`
4. **WARNING**: Mainnet gas fees are expensive! Consider:
   - Layer 2 solutions (Polygon, Arbitrum, Optimism)
   - Batch multiple hashes into single transaction
   - Use cheaper blockchains (BSC, Avalanche)

### Layer 2 Alternative (Cheaper)

Example for Polygon Mumbai testnet:

```env
SEPOLIA_RPC_URL=https://rpc-mumbai.maticvigil.com
# Deploy same contract to Mumbai
TAMPER_CONTRACT_ADDRESS=0x...
```

---

## 🎓 How It Works (Technical Deep Dive)

### Step 1: Canonical String Creation

```javascript
// Example for treatment record with ID 123
const data = {
  treatment_id: 123,
  entity_id: 1,
  farm_id: 5,
  user_id: 10,
  species: "cattle",
  medication_type: "Antibiotic",
  medicine: "Penicillin",
  route: "IM",
  dose_amount: 10,
  dose_unit: "ml",
  frequency_per_day: 2,
  duration_days: 5,
  start_date: "2025-12-01",
  end_date: "2025-12-05",
  status: "approved",
};

const canonical = buildCanonicalString("treatment_record", data);
// Result: "TR|123|1|5|10|cattle|Antibiotic|Penicillin|IM|10|ml|2|5|2025-12-01|2025-12-05|approved"
```

### Step 2: Keccak256 Hashing

```javascript
const { keccak256, toUtf8Bytes } = require("ethers");
const hash = keccak256(toUtf8Bytes(canonical));
// Result: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
```

### Step 3: Dual Storage

**MySQL**:

```sql
INSERT INTO tamper_proof_log (entity_type, entity_id, record_hash)
VALUES ('treatment_record', 123, '0x7f83b...');
```

**Blockchain** (via ethers.js):

```javascript
const contract = getTamperProofContract();
const tx = await contract.store("0x7f83b...");
await tx.wait(); // Wait for mining
```

### Step 4: Verification

```javascript
// Rebuild canonical from current DB data
const currentCanonical = buildCanonicalString("treatment_record", currentData);
const currentHash = hashCanonicalString(currentCanonical);

// Compare with logged hash
const loggedHash = "0x7f83b..."; // from tamper_proof_log
const isIntact = currentHash === loggedHash;
```

---

## 📞 Support

For issues or questions:

1. Check this README
2. Review error logs in console
3. Verify blockchain transaction on Etherscan
4. Check MySQL `tamper_proof_log` table

---

## ✅ Checklist

- [ ] `ethers` package installed (`npm install ethers`)
- [ ] Smart contract deployed to Sepolia
- [ ] `.env` file created with all 3 variables
- [ ] Wallet has Sepolia ETH for gas
- [ ] Server restarted after env changes
- [ ] Test API endpoint works
- [ ] Blockchain transaction visible on Etherscan
- [ ] Verification endpoint returns `isDbIntact: true`

---

**You're all set!** Your farm management system now has enterprise-grade tamper-proof logging with blockchain verification. 🎉
