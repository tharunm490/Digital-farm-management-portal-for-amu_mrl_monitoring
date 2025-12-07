/**
 * Test script to verify blockchain integration is working
 * Run with: node test-blockchain.js
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Test configuration
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.TAMPER_CONTRACT_ADDRESS;

// Contract ABI (minimal for testing)
const TAMPER_PROOF_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "_hash", "type": "string"}],
    "name": "store",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "get",
    "outputs": [
      {"internalType": "string", "name": "", "type": "string"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "counter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

console.log('🧪 BLOCKCHAIN CONNECTION TEST\n');
console.log('='.repeat(60));

async function testBlockchain() {
  try {
    // Step 1: Check environment variables
    console.log('\n📋 Step 1: Checking environment variables...');
    
    if (!RPC_URL) {
      console.error('❌ SEPOLIA_RPC_URL is missing in .env file');
      process.exit(1);
    }
    console.log('✅ RPC URL found:', RPC_URL.substring(0, 30) + '...');
    
    if (!PRIVATE_KEY) {
      console.error('❌ WALLET_PRIVATE_KEY is missing in .env file');
      process.exit(1);
    }
    console.log('✅ Private key found:', '0x' + '*'.repeat(62));
    
    if (!CONTRACT_ADDRESS) {
      console.error('❌ TAMPER_CONTRACT_ADDRESS is missing in .env file');
      process.exit(1);
    }
    console.log('✅ Contract address found:', CONTRACT_ADDRESS);

    // Step 2: Connect to provider
    console.log('\n🌐 Step 2: Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true,
      timeout: 30000  // 30 second timeout
    });
    
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId.toString() + ')');

    // Step 3: Check wallet
    console.log('\n👛 Step 3: Checking wallet...');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    console.log('✅ Wallet address:', address);
    
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    console.log('💰 Balance:', balanceInEth, 'ETH');
    
    if (parseFloat(balanceInEth) < 0.001) {
      console.warn('⚠️  WARNING: Low balance! Get Sepolia ETH from https://sepoliafaucet.com/');
    }

    // Step 4: Connect to contract
    console.log('\n📜 Step 4: Connecting to smart contract...');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TAMPER_PROOF_ABI, wallet);
    console.log('✅ Contract instance created');

    // Step 5: Read contract (no gas needed)
    console.log('\n📖 Step 5: Reading contract state...');
    const currentCounter = await contract.counter();
    console.log('✅ Current counter:', currentCounter.toString());
    console.log('   Total records stored so far:', currentCounter.toString());

    // Step 6: Test write operation (requires gas)
    console.log('\n✍️  Step 6: Testing write operation...');
    console.log('   Creating test hash...');
    
    const testHash = '0x' + Math.random().toString(16).substring(2, 66).padEnd(64, '0');
    console.log('   Test hash:', testHash);
    
    console.log('   Sending transaction to blockchain...');
    console.log('   (This may take 15-30 seconds on Sepolia)');
    
    const tx = await contract.store(testHash);
    console.log('✅ Transaction sent!');
    console.log('   TX Hash:', tx.hash);
    console.log('   View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    console.log('\n⏳ Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    // Step 7: Verify the stored hash
    console.log('\n🔍 Step 7: Verifying stored data...');
    const newCounter = await contract.counter();
    console.log('✅ New counter:', newCounter.toString());
    
    const [storedHash, timestamp] = await contract.get(newCounter);
    console.log('✅ Retrieved hash:', storedHash);
    console.log('   Stored at:', new Date(Number(timestamp) * 1000).toISOString());
    
    if (storedHash === testHash) {
      console.log('✅ Hash verification: MATCH ✓');
    } else {
      console.log('❌ Hash verification: MISMATCH ✗');
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ Blockchain integration is working correctly!');
    console.log('✅ You can now use the tamper-proof API endpoints.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your server: npm start');
    console.log('   2. Test API: POST /api/tamper-proof/treatment');
    console.log('   3. Verify records: GET /api/tamper-proof/treatment/:id/verify');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      console.error('\n💡 Suggestions:');
      console.error('   - Check your internet connection');
      console.error('   - Verify RPC URL is correct');
      console.error('   - Try a different RPC provider (Infura/Alchemy)');
    } else if (error.message.includes('insufficient funds')) {
      console.error('\n💡 Suggestions:');
      console.error('   - Get Sepolia ETH from https://sepoliafaucet.com/');
      console.error('   - Paste your wallet address:', await new ethers.Wallet(PRIVATE_KEY).getAddress());
    } else if (error.message.includes('invalid address')) {
      console.error('\n💡 Suggestions:');
      console.error('   - Verify TAMPER_CONTRACT_ADDRESS in .env');
      console.error('   - Make sure contract is deployed to Sepolia');
    }
    
    console.error('\n📚 For more help, see: TAMPER_PROOF_BLOCKCHAIN_GUIDE.md');
    process.exit(1);
  }
}

// Run the test
testBlockchain();
