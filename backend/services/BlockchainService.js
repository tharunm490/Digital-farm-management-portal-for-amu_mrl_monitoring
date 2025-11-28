const db = require('../config/database');
const crypto = require('crypto');

class BlockchainService {
  // Generate hash for data immutability
  static generateHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  // Log prescription to blockchain
  static async logPrescription(prescriptionData) {
    try {
      const {
        prescription_id,
        farm_id,
        vet_id,
        entity_id,
        drug_id,
        diagnosis,
        user_id
      } = prescriptionData;

      const dataHash = this.generateHash(prescriptionData);

      // Get previous hash for chain continuity
      const [previousLog] = await db.execute(
        `SELECT data_hash FROM blockchain_log 
         WHERE farm_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [farm_id]
      );

      const previousHash = previousLog.length > 0 ? previousLog[0].data_hash : null;

      // Log to blockchain
      const [result] = await db.execute(
        `INSERT INTO blockchain_log 
         (record_type, record_id, farm_id, entity_id, user_id, action, data_hash, previous_hash, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'prescription',
          prescription_id,
          farm_id,
          entity_id,
          user_id,
          'create_prescription',
          dataHash,
          previousHash,
          true
        ]
      );

      return {
        log_id: result.insertId,
        data_hash: dataHash,
        verified: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error logging prescription:', error);
      throw error;
    }
  }

  // Log treatment to blockchain
  static async logTreatment(treatmentData) {
    try {
      const {
        treatment_id,
        farm_id,
        entity_id,
        user_id,
        medicine,
        start_date,
        end_date
      } = treatmentData;

      const dataHash = this.generateHash(treatmentData);

      const [previousLog] = await db.execute(
        `SELECT data_hash FROM blockchain_log 
         WHERE farm_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [farm_id]
      );

      const previousHash = previousLog.length > 0 ? previousLog[0].data_hash : null;

      const [result] = await db.execute(
        `INSERT INTO blockchain_log 
         (record_type, record_id, farm_id, entity_id, user_id, action, data_hash, previous_hash, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'treatment',
          treatment_id,
          farm_id,
          entity_id,
          user_id,
          'record_treatment',
          dataHash,
          previousHash,
          true
        ]
      );

      return {
        log_id: result.insertId,
        data_hash: dataHash,
        verified: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error logging treatment:', error);
      throw error;
    }
  }

  // Log dispatch/sale to blockchain
  static async logDispatch(dispatchData) {
    try {
      const {
        farm_id,
        entity_id,
        user_id,
        processor_id,
        compliance_status,
        product_type,
        quantity
      } = dispatchData;

      const dataHash = this.generateHash(dispatchData);

      const [previousLog] = await db.execute(
        `SELECT data_hash FROM blockchain_log 
         WHERE farm_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [farm_id]
      );

      const previousHash = previousLog.length > 0 ? previousLog[0].data_hash : null;

      const [result] = await db.execute(
        `INSERT INTO blockchain_log 
         (record_type, farm_id, entity_id, user_id, action, data_hash, previous_hash, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'dispatch',
          farm_id,
          entity_id,
          user_id,
          `dispatch_${product_type}_${compliance_status}`,
          dataHash,
          previousHash,
          compliance_status === 'safe'
        ]
      );

      return {
        log_id: result.insertId,
        data_hash: dataHash,
        verified: compliance_status === 'safe',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error logging dispatch:', error);
      throw error;
    }
  }

  // Log AMU record
  static async logAMURecord(amuData) {
    try {
      const {
        amu_id,
        farm_id,
        entity_id,
        user_id,
        medicine,
        predicted_mrl_risk,
        risk_category
      } = amuData;

      const dataHash = this.generateHash(amuData);

      const [previousLog] = await db.execute(
        `SELECT data_hash FROM blockchain_log 
         WHERE farm_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [farm_id]
      );

      const previousHash = previousLog.length > 0 ? previousLog[0].data_hash : null;

      const [result] = await db.execute(
        `INSERT INTO blockchain_log 
         (record_type, record_id, farm_id, entity_id, user_id, action, data_hash, previous_hash, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'amu_record',
          amu_id,
          farm_id,
          entity_id,
          user_id,
          `amu_${risk_category}`,
          dataHash,
          previousHash,
          risk_category !== 'unsafe'
        ]
      );

      return {
        log_id: result.insertId,
        data_hash: dataHash,
        verified: risk_category !== 'unsafe',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error logging AMU record:', error);
      throw error;
    }
  }

  // Verify record integrity
  static async verifyIntegrity(recordId, recordType) {
    try {
      const [logs] = await db.execute(
        `SELECT * FROM blockchain_log 
         WHERE record_type = ? AND record_id = ?
         ORDER BY created_at DESC`,
        [recordType, recordId]
      );

      if (!logs.length) {
        return {
          verified: false,
          message: 'No blockchain record found'
        };
      }

      const log = logs[0];

      // Verify hash chain continuity
      const [previousLogs] = await db.execute(
        `SELECT * FROM blockchain_log 
         WHERE log_id < ? AND created_at < ?
         ORDER BY created_at DESC LIMIT 1`,
        [log.log_id, log.created_at]
      );

      const expectedPreviousHash = previousLogs.length > 0 ? previousLogs[0].data_hash : null;

      const hashValid = log.previous_hash === expectedPreviousHash;

      return {
        verified: hashValid && log.verified,
        log_id: log.log_id,
        data_hash: log.data_hash,
        previous_hash: log.previous_hash,
        expected_previous_hash: expectedPreviousHash,
        hash_valid: hashValid,
        record_verified: log.verified,
        created_at: log.created_at,
        audit_trail: logs
      };
    } catch (error) {
      console.error('Error verifying integrity:', error);
      throw error;
    }
  }

  // Get farm audit trail
  static async getFarmAuditTrail(farmId, limit = 50) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM blockchain_log 
         WHERE farm_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [farmId, limit]
      );

      return results;
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw error;
    }
  }

  // Get entity audit trail
  static async getEntityAuditTrail(entityId, limit = 50) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM blockchain_log 
         WHERE entity_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [entityId, limit]
      );

      return results;
    } catch (error) {
      console.error('Error fetching entity audit trail:', error);
      throw error;
    }
  }

  // Check if record has been tampered
  static async checkTamperStatus(recordId, recordType, originalData) {
    try {
      const [logs] = await db.execute(
        `SELECT * FROM blockchain_log 
         WHERE record_type = ? AND record_id = ?`,
        [recordType, recordId]
      );

      if (!logs.length) {
        return {
          tampered: null,
          message: 'No blockchain record found'
        };
      }

      const log = logs[0];
      const currentHash = this.generateHash(originalData);

      return {
        tampered: currentHash !== log.data_hash,
        original_hash: log.data_hash,
        current_hash: currentHash,
        verified: log.verified
      };
    } catch (error) {
      console.error('Error checking tamper status:', error);
      throw error;
    }
  }

  // Get blockchain statistics
  static async getBlockchainStats(farmId) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          record_type,
          COUNT(*) as count,
          SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified_count
         FROM blockchain_log
         WHERE farm_id = ?
         GROUP BY record_type`,
        [farmId]
      );

      const [totalVerified] = await db.execute(
        `SELECT COUNT(*) as total FROM blockchain_log 
         WHERE farm_id = ? AND verified = TRUE`,
        [farmId]
      );

      const [totalRecords] = await db.execute(
        `SELECT COUNT(*) as total FROM blockchain_log 
         WHERE farm_id = ?`,
        [farmId]
      );

      return {
        total_records: totalRecords[0]?.total || 0,
        verified_records: totalVerified[0]?.total || 0,
        by_type: stats,
        verification_rate: totalRecords[0]?.total > 0 
          ? Math.round((totalVerified[0]?.total / totalRecords[0]?.total) * 100) 
          : 0
      };
    } catch (error) {
      console.error('Error fetching blockchain stats:', error);
      throw error;
    }
  }
}

module.exports = BlockchainService;
