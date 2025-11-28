const db = require('../config/database');
const crypto = require('crypto');

class ComplianceEngine {
  // Check if entity can be safely sold
  static async checkWithdrawalCompliance(entityId, saleDate, productType) {
    try {
      const saleDateTime = new Date(saleDate);

      // Get all active treatments for this entity
      const [treatments] = await db.execute(
        `SELECT tr.*, amu.safe_date, amu.predicted_withdrawal_days, amu.medicine
         FROM treatment_records tr
         LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
         WHERE tr.entity_id = ? AND tr.is_vaccine = FALSE
         ORDER BY tr.end_date DESC`,
        [entityId]
      );

      const violations = [];
      const safe = [];

      for (const treatment of treatments) {
        if (!treatment.end_date) continue;

        const safeDate = treatment.safe_date 
          ? new Date(treatment.safe_date)
          : this.calculateSafeDate(treatment);

        if (saleDateTime < safeDate) {
          violations.push({
            treatment_id: treatment.treatment_id,
            medicine: treatment.medicine,
            safe_date: safeDate,
            days_remaining: Math.ceil((safeDate - saleDateTime) / (1000 * 60 * 60 * 24))
          });
        } else {
          safe.push({
            treatment_id: treatment.treatment_id,
            medicine: treatment.medicine
          });
        }
      }

      const complianceStatus = violations.length === 0 ? 'safe' : 
                              violations.length === 1 ? 'borderline' : 'unsafe';

      return {
        compliance_status: complianceStatus,
        is_compliant: violations.length === 0,
        violations,
        safe_treatments: safe,
        recommendation: this.getComplianceRecommendation(violations)
      };
    } catch (error) {
      console.error('Error checking withdrawal compliance:', error);
      throw error;
    }
  }

  // Calculate safe date based on treatment end date and withdrawal period
  static calculateSafeDate(treatmentRecord) {
    const endDate = new Date(treatmentRecord.end_date);
    const withdrawalDays = treatmentRecord.predicted_withdrawal_days || 0;
    
    const safeDate = new Date(endDate);
    safeDate.setDate(safeDate.getDate() + withdrawalDays);
    
    return safeDate;
  }

  // Generate compliance alerts for a farm
  static async generateAlerts(farmId) {
    try {
      const [entities] = await db.execute(
        `SELECT * FROM animals_or_batches WHERE farm_id = ?`,
        [farmId]
      );

      const alerts = [];

      for (const entity of entities) {
        // Check for withdrawal violations
        const violationAlerts = await this.checkWithdrawalViolations(entity.entity_id);
        alerts.push(...violationAlerts);

        // Check for banned drugs
        const bannedDrugAlerts = await this.checkBannedDrugs(entity.entity_id);
        alerts.push(...bannedDrugAlerts);

        // Check for critical drug overuse
        const criticalDrugAlerts = await this.checkCriticalDrugOveruse(entity.entity_id);
        alerts.push(...criticalDrugAlerts);
      }

      // Insert alerts into database
      for (const alert of alerts) {
        await db.execute(
          `INSERT INTO compliance_alerts 
           (farm_id, entity_id, user_id, alert_type, severity, message)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            farmId,
            alert.entity_id,
            alert.user_id,
            alert.alert_type,
            alert.severity,
            alert.message
          ]
        );
      }

      return alerts;
    } catch (error) {
      console.error('Error generating alerts:', error);
      throw error;
    }
  }

  // Check for withdrawal violations
  static async checkWithdrawalViolations(entityId) {
    try {
      const alerts = [];
      const today = new Date();

      const [treatments] = await db.execute(
        `SELECT tr.*, amu.safe_date, amu.medicine
         FROM treatment_records tr
         LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
         WHERE tr.entity_id = ? AND tr.is_vaccine = FALSE
         AND amu.safe_date IS NOT NULL`,
        [entityId]
      );

      for (const treatment of treatments) {
        const safeDate = new Date(treatment.safe_date);
        if (today < safeDate) {
          // Still in withdrawal period
          const daysRemaining = Math.ceil((safeDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 3) {
            alerts.push({
              entity_id: entityId,
              user_id: treatment.user_id,
              alert_type: 'withdrawal_violation',
              severity: daysRemaining === 0 ? 'critical' : 'high',
              message: `Withdrawal period ending soon for ${treatment.medicine}. Safe to sell after ${safeDate.toLocaleDateString()}`
            });
          }
        } else if (today > safeDate) {
          // Already safe
          continue;
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking withdrawal violations:', error);
      return [];
    }
  }

  // Check for banned drugs
  static async checkBannedDrugs(entityId) {
    try {
      const alerts = [];

      const [bannedDrugs] = await db.execute(
        `SELECT DISTINCT amu.treatment_id, amu.medicine, amu.entity_id, amu.user_id
         FROM amu_records amu
         WHERE amu.entity_id = ? 
         AND amu.medicine IN (SELECT drug_name FROM drug_master WHERE banned_for_food_animals = TRUE)`,
        [entityId]
      );

      for (const record of bannedDrugs) {
        alerts.push({
          entity_id: record.entity_id,
          user_id: record.user_id,
          alert_type: 'banned_drug',
          severity: 'critical',
          message: `CRITICAL: ${record.medicine} is banned for food animals. Immediate action required.`
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking banned drugs:', error);
      return [];
    }
  }

  // Check for critical drug overuse
  static async checkCriticalDrugOveruse(entityId) {
    try {
      const alerts = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [criticalDrugs] = await db.execute(
        `SELECT COUNT(*) as count, amu.medicine
         FROM amu_records amu
         WHERE amu.entity_id = ? 
         AND amu.created_at >= ?
         AND amu.medicine IN (SELECT drug_name FROM drug_master WHERE who_criticality = 'critically_important')
         GROUP BY amu.medicine
         HAVING count > 3`,
        [entityId, thirtyDaysAgo]
      );

      for (const record of criticalDrugs) {
        const [entity] = await db.execute(
          'SELECT user_id FROM treatment_records WHERE entity_id = ? LIMIT 1',
          [entityId]
        );

        alerts.push({
          entity_id: entityId,
          user_id: entity[0]?.user_id,
          alert_type: 'critical_drug_overuse',
          severity: 'high',
          message: `${record.medicine} (critically important antimicrobial) has been used ${record.count} times in 30 days. Review stewardship practices.`
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking critical drug overuse:', error);
      return [];
    }
  }

  // Calculate farm risk score (0-100)
  static async getRiskScore(farmId) {
    try {
      let score = 0;

      // Get farm AMU data
      const [amuRecords] = await db.execute(
        `SELECT COUNT(*) as total_records, 
                SUM(CASE WHEN risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
                SUM(CASE WHEN risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count
         FROM amu_records
         WHERE farm_id = ?`,
        [farmId]
      );

      const amuData = amuRecords[0];

      // Get compliance alerts
      const [alerts] = await db.execute(
        `SELECT severity, COUNT(*) as count
         FROM compliance_alerts
         WHERE farm_id = ? AND resolved = FALSE
         GROUP BY severity`,
        [farmId]
      );

      // Get violation count
      const [violations] = await db.execute(
        `SELECT COUNT(*) as count FROM compliance_alerts 
         WHERE farm_id = ? AND alert_type = 'withdrawal_violation' AND resolved = FALSE`,
        [farmId]
      );

      // Calculate score
      score += amuData.unsafe_count * 15;
      score += amuData.borderline_count * 8;
      
      alerts.forEach(alert => {
        if (alert.severity === 'critical') score += alert.count * 25;
        if (alert.severity === 'high') score += alert.count * 15;
        if (alert.severity === 'medium') score += alert.count * 8;
        if (alert.severity === 'low') score += alert.count * 3;
      });

      score += violations[0].count * 20;

      // Cap at 100
      score = Math.min(score, 100);

      // Determine risk level
      let riskLevel = 'low';
      if (score >= 75) riskLevel = 'critical';
      else if (score >= 50) riskLevel = 'high';
      else if (score >= 25) riskLevel = 'medium';

      // Update farm_amu_metrics
      await db.execute(
        `INSERT INTO farm_amu_metrics (farm_id, risk_score, risk_level)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE risk_score = ?, risk_level = ?`,
        [farmId, score, riskLevel, score, riskLevel]
      );

      return {
        score,
        risk_level: riskLevel,
        unsafe_records: amuData.unsafe_count || 0,
        borderline_records: amuData.borderline_count || 0,
        unresolved_alerts: alerts.reduce((sum, a) => sum + a.count, 0),
        withdrawal_violations: violations[0].count || 0
      };
    } catch (error) {
      console.error('Error calculating risk score:', error);
      throw error;
    }
  }

  // Get compliance recommendation
  static getComplianceRecommendation(violations) {
    if (violations.length === 0) {
      return '✅ Product is safe for sale. All withdrawal periods have been completed.';
    }

    const minDays = Math.min(...violations.map(v => v.days_remaining));
    
    if (minDays <= 0) {
      return '✅ Safe for sale. All withdrawal periods completed.';
    } else if (minDays === 1) {
      return '⚠️ Borderline: Safe tomorrow. Recommend waiting 1 more day.';
    } else if (minDays <= 3) {
      return `⚠️ Not safe yet. Wait ${minDays} more days before selling.`;
    } else {
      return `🔴 NOT SAFE. ${minDays} days remaining in withdrawal period.`;
    }
  }

  // Resolve an alert
  static async resolveAlert(alertId, resolutionNotes) {
    try {
      const [result] = await db.execute(
        `UPDATE compliance_alerts 
         SET resolved = TRUE, resolution_notes = ?, resolved_at = NOW()
         WHERE alert_id = ?`,
        [resolutionNotes, alertId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  // Get unresolved alerts for farm
  static async getUnresolvedAlerts(farmId, limit = 20) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM compliance_alerts 
         WHERE farm_id = ? AND resolved = FALSE
         ORDER BY severity DESC, created_at DESC
         LIMIT ?`,
        [farmId, limit]
      );
      return results;
    } catch (error) {
      console.error('Error fetching unresolved alerts:', error);
      throw error;
    }
  }

  // Get farm compliance metrics
  static async getFarmComplianceMetrics(farmId) {
    try {
      const [metrics] = await db.execute(
        `SELECT * FROM farm_amu_metrics WHERE farm_id = ?`,
        [farmId]
      );

      if (!metrics.length) {
        return this.getRiskScore(farmId);
      }

      return metrics[0];
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      throw error;
    }
  }
}

module.exports = ComplianceEngine;
