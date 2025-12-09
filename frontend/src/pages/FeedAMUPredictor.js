import React, { useState, useEffect } from 'react';
import FarmerNavigation from '../components/FarmerNavigation';

const FeedAMUPredictor = () => {
  const [species, setSpecies] = useState('cattle');
  const [availableFeeds, setAvailableFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || '/api';
  const farmerId = JSON.parse(localStorage.getItem('user'))?.user_id;

  useEffect(() => {
    fetchFeedScores();
    fetchHistory();
  }, [species]);

  const fetchFeedScores = async () => {
    try {
      const response = await fetch(`${API_URL}/feed/feed-scores/${species}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setAvailableFeeds(data);
    } catch (error) {
      console.error('Error fetching feed scores:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/feed/farmer-risk-summary/${farmerId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const addFeed = (feed) => {
    if (!selectedFeeds.find(f => f.feed_item === feed.feed_item)) {
      setSelectedFeeds([...selectedFeeds, { 
        feed_item: feed.feed_item, 
        fni: feed.fni,
        inclusion_rate: 0 
      }]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const updateInclusionRate = (index, value) => {
    const updated = [...selectedFeeds];
    updated[index].inclusion_rate = parseFloat(value) || 0;
    setSelectedFeeds(updated);
  };

  const removeFeed = (index) => {
    setSelectedFeeds(selectedFeeds.filter((_, i) => i !== index));
  };

  const calculateRisk = async () => {
    // Validate total inclusion rate
    const totalInclusion = selectedFeeds.reduce((sum, feed) => sum + feed.inclusion_rate, 0);
    
    if (totalInclusion === 0) {
      alert('Please enter inclusion rates for your feeds');
      return;
    }
    
    if (Math.abs(totalInclusion - 1.0) > 0.01) {
      alert(`Total inclusion rate should equal 100% (currently ${(totalInclusion * 100).toFixed(1)}%)`);
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/feed/farmer-feed-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          farmer_id: farmerId,
          species,
          feeds: selectedFeeds
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setRiskResult(result);
        fetchHistory();
      } else {
        alert(result.error || 'Failed to calculate risk');
      }
    } catch (error) {
      console.error('Error calculating risk:', error);
      alert('Failed to calculate AMU risk');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'very_high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskBadge = (level) => {
    const badges = {
      low: '🟢 LOW RISK',
      moderate: '🟡 MODERATE RISK',
      high: '🟠 HIGH RISK',
      very_high: '🔴 VERY HIGH RISK'
    };
    return badges[level] || level;
  };

  const filteredFeeds = availableFeeds.filter(feed =>
    feed.feed_item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInclusion = selectedFeeds.reduce((sum, feed) => sum + feed.inclusion_rate, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <FarmerNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🌾 Feed & AMU Predictor</h1>
          <p className="text-gray-600">
            Calculate your livestock's antimicrobial usage risk based on feed nutrition quality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Species Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">1️⃣ Select Livestock Species</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSpecies('cattle');
                    setSelectedFeeds([]);
                    setRiskResult(null);
                  }}
                  className={`p-6 rounded-lg border-2 transition ${
                    species === 'cattle'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-4xl mb-2">🐄</div>
                  <div className="font-semibold">Cattle</div>
                </button>
                <button
                  onClick={() => {
                    setSpecies('poultry');
                    setSelectedFeeds([]);
                    setRiskResult(null);
                  }}
                  className={`p-6 rounded-lg border-2 transition ${
                    species === 'poultry'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-4xl mb-2">🐔</div>
                  <div className="font-semibold">Poultry</div>
                </button>
              </div>
            </div>

            {/* Feed Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">2️⃣ Add Feed Ingredients</h2>
              
              {/* Search Box */}
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Feed Items
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Click to see all feeds or type to search..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Button to toggle dropdown */}
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
                >
                  <span className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showDropdown && (
                <div className="mb-4 max-h-64 overflow-y-auto border-2 border-blue-300 rounded-lg bg-white shadow-lg">
                  {filteredFeeds.length > 0 ? (
                    <>
                      <div className="sticky top-0 bg-blue-50 px-4 py-2 border-b border-blue-200 text-sm font-semibold text-blue-800">
                        {filteredFeeds.length} feed{filteredFeeds.length !== 1 ? 's' : ''} available
                      </div>
                      {filteredFeeds.map(feed => (
                        <div
                          key={feed.feed_id}
                          onClick={() => addFeed(feed)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-800">{feed.feed_item}</div>
                          <div className="text-xs text-gray-600 mt-1">FNI Score: {feed.fni}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      {availableFeeds.length === 0 ? 'No feeds available for this species' : 'No feeds found matching your search'}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Feeds */}
              <div className="space-y-3">
                {selectedFeeds.map((feed, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{feed.feed_item}</div>
                      <div className="text-xs text-gray-600">FNI: {feed.fni}</div>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={feed.inclusion_rate}
                        onChange={(e) => updateInclusionRate(index, e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {(feed.inclusion_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeFeed(index)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {selectedFeeds.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Search and add feed ingredients to start
                </div>
              )}

              {/* Total Inclusion */}
              {selectedFeeds.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                  <span className="font-semibold">Total Inclusion Rate:</span>
                  <span className={`text-lg font-bold ${
                    Math.abs(totalInclusion - 1.0) < 0.01 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(totalInclusion * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            {selectedFeeds.length > 0 && (
              <button
                onClick={calculateRisk}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? '⏳ Calculating...' : '🧮 Calculate AMU Risk'}
              </button>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Risk Result */}
            {riskResult && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-4">📊 Risk Assessment</h2>
                
                <div className={`p-4 rounded-lg border-2 mb-4 ${getRiskColor(riskResult.riskLevel)}`}>
                  <div className="text-center text-2xl font-bold mb-2">
                    {getRiskBadge(riskResult.riskLevel)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Daily FNI:</span>
                    <span className="font-semibold">{riskResult.dailyFNI}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Health Risk:</span>
                    <span className="font-semibold">{riskResult.healthRisk}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-50 rounded">
                    <span className="text-gray-700">AMU Risk:</span>
                    <span className="font-bold text-blue-700">{riskResult.amuRisk}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-yellow-800">
                    <strong>💡 Recommendation:</strong>
                    {riskResult.riskLevel === 'low' && ' Excellent! Maintain current feed quality.'}
                    {riskResult.riskLevel === 'moderate' && ' Consider improving feed nutrition quality.'}
                    {riskResult.riskLevel === 'high' && ' Consult veterinarian and improve feed quality.'}
                    {riskResult.riskLevel === 'very_high' && ' Urgent! Consult veterinarian immediately.'}
                  </div>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">ℹ️ How It Works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Select your livestock species</li>
                <li>• Add feed ingredients from the list</li>
                <li>• Enter inclusion rate (% of total ration)</li>
                <li>• Total should equal 100%</li>
                <li>• System calculates AMU risk automatically</li>
              </ul>
            </div>

            {/* Risk Level Guide */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold mb-3">🚦 Risk Level Guide</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>Low (&lt;0.20) - Optimal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span>Moderate (0.20-0.40) - Monitor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  <span>High (0.40-0.60) - Action Needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span>Very High (&gt;0.60) - Urgent</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">📜 Your Feed History</h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showHistory && history.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily FNI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AMU Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((entry) => (
                    <tr key={entry.summary_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{entry.species}</td>
                      <td className="px-4 py-3 text-sm font-medium">{parseFloat(entry.daily_fni).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{parseFloat(entry.amu_risk).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(entry.risk_level)}`}>
                          {entry.risk_level.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showHistory && history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No history available yet. Calculate your first feed risk assessment!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedAMUPredictor;
