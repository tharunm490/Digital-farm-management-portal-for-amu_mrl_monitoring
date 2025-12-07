const { ethers } = require('ethers');

// TamperProofLog Smart Contract ABI
const TAMPER_PROOF_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_hash",
        "type": "string"
      }
    ],
    "name": "store",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "get",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "counter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "hash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "time",
        "type": "uint256"
      }
    ],
    "name": "Stored",
    "type": "event"
  }
];

/**
 * Get TamperProofLog contract instance
 * @returns {ethers.Contract}
 */
function getTamperProofContract() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const contractAddress = process.env.TAMPER_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error('Missing blockchain configuration. Please set SEPOLIA_RPC_URL, WALLET_PRIVATE_KEY, and TAMPER_CONTRACT_ADDRESS in .env');
  }

  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Create wallet
  const wallet = new ethers.Wallet(privateKey, provider);

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, TAMPER_PROOF_ABI, wallet);

  return contract;
}

/**
 * Store tamper-proof hash on blockchain
 * @param {string} recordHash - The hash to store (0x-prefixed hex string)
 * @returns {Promise<{blockchainId: number, txHash: string}>}
 */
async function storeTamperProofOnChain(recordHash) {
  try {
    const contract = getTamperProofContract();

    console.log('📝 Storing hash on blockchain:', recordHash.substring(0, 10) + '...');

    // Call store function
    const tx = await contract.store(recordHash);
    
    console.log('⏳ Transaction sent:', tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    // Parse the Stored event to get the blockchain ID
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'Stored';
      } catch {
        return false;
      }
    });

    let blockchainId;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      blockchainId = Number(parsed.args.id);
    } else {
      // Fallback: get current counter
      blockchainId = Number(await contract.counter());
    }

    return {
      blockchainId,
      txHash: tx.hash
    };

  } catch (error) {
    console.error('❌ Blockchain storage failed:', error.message);
    throw error;
  }
}

/**
 * Retrieve hash from blockchain by ID
 * @param {number} blockchainId - The ID to retrieve
 * @returns {Promise<{hash: string, timestamp: number}>}
 */
async function getTamperProofFromChain(blockchainId) {
  try {
    const contract = getTamperProofContract();

    const [hash, timestamp] = await contract.get(blockchainId);

    return {
      hash,
      timestamp: Number(timestamp)
    };

  } catch (error) {
    console.error('❌ Failed to retrieve from blockchain:', error.message);
    throw error;
  }
}

module.exports = {
  getTamperProofContract,
  storeTamperProofOnChain,
  getTamperProofFromChain,
  TAMPER_PROOF_ABI
};
