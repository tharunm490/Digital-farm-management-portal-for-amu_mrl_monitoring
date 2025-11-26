// TissuePredictionTable.js - Component for displaying tissue-wise residual predictions
import React from 'react';
import './TissuePredictionTable.css';

const TissuePredictionTable = ({ tissueResults, matrix }) => {
  if (!tissueResults) return null;

  const getRiskIcon = (category) => {
    switch (category) {
      case 'SAFE': return '✅';
      case 'BORDERLINE': return '⚠️';
      case 'UNSAFE': return '❌';
      default: return '❓';
    }
  };

  const getRiskClass = (category) => {
    return `risk-${category.toLowerCase()}`;
  };

  const getMatrixIcon = (matrixType) => {
    switch (matrixType?.toLowerCase()) {
      case 'meat': return '🥩';
      case 'milk': return '🥛';
      case 'egg': return '🥚';
      default: return '🔬';
    }
  };

  return (
    <div className="tissue-prediction-container">
      <div className="tissue-header">
        <h4>🧬 Tissue-wise Residue Predictions</h4>
        <div className="matrix-info">
          <span className="matrix-badge">
            {getMatrixIcon(matrix)} {matrix?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div className="overall-risk-summary">
          <span className="worst-tissue">Worst Tissue: <strong>{tissueResults.worst_tissue}</strong></span>
          <span className={`overall-risk-badge ${getRiskClass(tissueResults.overall_risk_category)}`}>
            {getRiskIcon(tissueResults.overall_risk_category)} {tissueResults.overall_risk_category}
          </span>
        </div>
      </div>
      
      {tissueResults.message && (
        <div className="tissue-message warning">
          {tissueResults.message}
        </div>
      )}
      
      <div className="tissue-table-wrapper">
        <table className="tissue-table">
          <thead>
            <tr>
              <th>Tissue Type</th>
              <th>Predicted Residue (µg/kg)</th>
              <th>MRL (Maximum Residue Limit) (µg/kg)</th>
              <th>Risk Percentage</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(tissueResults.tissues).map(([tissue, data]) => (
              <tr key={tissue} className={tissue === tissueResults.worst_tissue ? 'worst-tissue-row' : ''}>
                <td className="tissue-name">
                  {tissue === 'muscle' && '🍖'}
                  {tissue === 'liver' && '🫘'}
                  {tissue === 'kidney' && '🫑'}
                  {tissue === 'fat' && '🥓'}
                  {tissue}
                </td>
                <td className="predicted-mrl">{data.predicted_mrl.toFixed(2)}</td>
                <td className="predicted-residual-limit">{data.predicted_residual_limit || data.base_mrl || 'N/A'}</td>
                <td className="risk-percent">
                  <div className="risk-bar">
                    <div 
                      className="risk-fill" 
                      style={{ width: `${Math.min(parseFloat(data.risk_percent) || 0, 100)}%` }}
                    ></div>
                  </div>
                  {parseFloat(data.risk_percent).toFixed(2)}%
                </td>
                <td className={`risk-category ${getRiskClass(data.risk_category)}`}>
                  {getRiskIcon(data.risk_category)} {data.risk_category}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="tissue-legend">
        <div className="legend-item">
          <span className="legend-color safe"></span>
          <span>Safe (&lt; 100% of MRL)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color borderline"></span>
          <span>Borderline (100-125% of MRL)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color unsafe"></span>
          <span>Unsafe (&gt; 125% of MRL)</span>
        </div>
      </div>
    </div>
  );
};

export default TissuePredictionTable;