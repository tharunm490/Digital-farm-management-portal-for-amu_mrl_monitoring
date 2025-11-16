import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { batchAPI } from '../services/api';
import './BatchList.css';

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await batchAPI.getAll();
      setBatches(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch batches. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch =>
    batch.batch_id?.toString().includes(searchTerm) ||
    batch.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Loading batches...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="batch-list-page">
      <div className="page-header">
        <h1>Batch List</h1>
        <p>View all farm batches and their details</p>
      </div>

      <div className="search-section card">
        <input
          type="text"
          placeholder="Search by Batch ID, Species, Breed, or Farmer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="batches-grid">
        {filteredBatches.length === 0 ? (
          <div className="no-data">No batches found</div>
        ) : (
          filteredBatches.map((batch) => (
            <div key={batch.batch_id} className="batch-card">
              <div className="batch-header">
                <h3>Batch #{batch.batch_id}</h3>
                <span className="batch-size">{batch.batch_size} animals</span>
              </div>
              
              <div className="batch-details">
                <div className="detail-row">
                  <span className="label">Species:</span>
                  <span className="value">{batch.species}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Breed:</span>
                  <span className="value">{batch.breed}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Matrix:</span>
                  <span className="value">{batch.matrix}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Farmer:</span>
                  <span className="value">{batch.farmer_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Farm:</span>
                  <span className="value">{batch.farm_name || 'N/A'}</span>
                </div>
              </div>

              <div className="batch-actions">
                <Link to={`/verify?batch_id=${batch.batch_id}`} className="btn btn-secondary">
                  View Details
                </Link>
                <Link to={`/qr-generator?batch_id=${batch.batch_id}`} className="btn btn-primary">
                  Generate QR
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BatchList;
