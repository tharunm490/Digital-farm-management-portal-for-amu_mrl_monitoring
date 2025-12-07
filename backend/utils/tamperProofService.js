const { keccak256, toUtf8Bytes } = require('ethers');
const db = require('../config/database');
const { storeTamperProofOnChain } = require('./blockchain');

/**
 * Entity types that support tamper-proof logging
 */
const ENTITY_TYPES = {
  TREATMENT: 'treatment_record',
  VACCINATION: 'vaccination_history',
  AMU: 'amu_record',
  DISTRIBUTOR_VERIFICATION: 'distributor_verification',
  LOAN: 'loan_request'
};

/**
 * Build canonical string from entity data in fixed order
 * This ensures consistent hashing regardless of object property order
 */
function buildCanonicalString(entityType, data) {
  switch (entityType) {
    case ENTITY_TYPES.TREATMENT:
      return `TR|${data.treatment_id}|${data.entity_id}|${data.farm_id}|${data.user_id}|${data.species}|${data.medication_type}|${data.medicine}|${data.route}|${data.dose_amount}|${data.dose_unit}|${data.frequency_per_day}|${data.duration_days}|${data.start_date}|${data.end_date}|${data.status}`;

    case ENTITY_TYPES.VACCINATION:
      return `VH|${data.vacc_id}|${data.entity_id}|${data.treatment_id}|${data.vaccine_name}|${data.given_date}|${data.next_due_date}|${data.interval_days}|${data.vaccine_total_months || ''}|${data.vaccine_end_date || ''}`;

    case ENTITY_TYPES.AMU:
      return `AMU|${data.amu_id}|${data.treatment_id}|${data.entity_id}|${data.farm_id}|${data.user_id}|${data.species}|${data.medication_type}|${data.matrix || ''}|${data.medicine}|${data.dose_amount}|${data.dose_unit}|${data.frequency_per_day}|${data.duration_days}|${data.start_date}|${data.end_date}|${data.predicted_mrl || ''}|${data.predicted_withdrawal_days || ''}|${data.safe_date || ''}|${data.risk_percent || ''}|${data.overdosage}|${data.risk_category || ''}|${data.worst_tissue || ''}|${data.model_version || ''}`;

    case ENTITY_TYPES.DISTRIBUTOR_VERIFICATION:
      return `DVL|${data.log_id}|${data.distributor_id}|${data.qr_id}|${data.entity_id}|${data.verification_status}|${data.is_withdrawal_safe}|${data.safe_date || ''}|${data.reason || ''}|${data.scanned_at}`;

    case ENTITY_TYPES.LOAN:
      return `LOAN|${data.loan_id}|${data.farmer_id}|${data.farm_id}|${data.purpose}|${data.amount_requested}|${data.status}|${data.created_at}|${data.action_by || ''}|${data.action_date || ''}|${data.authority_department || ''}|${data.authority_designation || ''}`;

    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Hash canonical string using Keccak256
 * Returns 0x-prefixed hex string
 */
function hashCanonicalString(canonical) {
  const hash = keccak256(toUtf8Bytes(canonical));
  return hash;
}

/**
 * Log tamper-proof hash to database and blockchain
 * @param {string} entityType - Type of entity (treatment_record, amu_record, etc.)
 * @param {number} entityId - ID of the entity
 * @param {string} canonical - Canonical string representation
 * @returns {Promise<{dbLogId: number, blockchainId: number, txHash: string, recordHash: string}>}
 */
async function logTamperProof(entityType, entityId, canonical) {
  const connection = await db.getConnection();
  
  try {
    // Compute hash
    const recordHash = hashCanonicalString(canonical);

    // Insert into MySQL tamper_proof_log
    const [result] = await connection.execute(
      `INSERT INTO tamper_proof_log (entity_type, entity_id, record_hash) 
       VALUES (?, ?, ?)`,
      [entityType, entityId, recordHash]
    );

    const dbLogId = result.insertId;

    // Store on blockchain
    const { blockchainId, txHash } = await storeTamperProofOnChain(recordHash);

    console.log(`✅ Tamper-proof log created:`, {
      entityType,
      entityId,
      dbLogId,
      blockchainId,
      txHash: txHash.substring(0, 10) + '...'
    });

    return {
      dbLogId,
      blockchainId,
      txHash,
      recordHash
    };

  } catch (error) {
    console.error('Error in logTamperProof:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verify integrity of a record by comparing hashes
 * @param {string} entityType - Type of entity
 * @param {number} entityId - ID of the entity
 * @param {object} currentData - Current data from database
 * @returns {Promise<{isDbIntact: boolean, isBlockchainIntact: boolean, currentHash: string, loggedHash: string, onchainHash: string}>}
 */
async function verifyTamperProof(entityType, entityId, currentData) {
  const connection = await db.getConnection();
  
  try {
    // Rebuild canonical string from current data
    const canonical = buildCanonicalString(entityType, currentData);
    const currentHash = hashCanonicalString(canonical);

    // Get logged hash from database
    const [logs] = await connection.execute(
      `SELECT record_hash FROM tamper_proof_log 
       WHERE entity_type = ? AND entity_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [entityType, entityId]
    );

    if (logs.length === 0) {
      throw new Error('No tamper-proof log found for this record');
    }

    const loggedHash = logs[0].record_hash;
    const isDbIntact = (currentHash === loggedHash);

    // Optional: Verify against blockchain
    // This would require storing blockchain_id in tamper_proof_log
    // For now, we'll return the comparison result
    
    return {
      isDbIntact,
      currentHash,
      loggedHash,
      message: isDbIntact ? 'Record integrity verified ✓' : 'Record has been tampered! ⚠️'
    };

  } catch (error) {
    console.error('Error in verifyTamperProof:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  ENTITY_TYPES,
  buildCanonicalString,
  hashCanonicalString,
  logTamperProof,
  verifyTamperProof
};
