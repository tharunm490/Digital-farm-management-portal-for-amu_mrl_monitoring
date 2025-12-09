import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import AuthorityNavigation from '../../components/AuthorityNavigation';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BiomassUsageAnalytics = () => {
  const [biomassData, setBiomassData] = useState([]);
  const [statsData, setStatsData] = useState({});
  const [locationData, setLocationData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  // Species color mapping
  const speciesColors = {
    cattle: '#E57373',    // Red
    goat: '#81C784',      // Green
    sheep: '#64B5F6',     // Blue
    pig: '#FFB74D',       // Orange
    poultry: '#BA68C8'    // Purple
  };

  useEffect(() => {
    fetchBiomassData();
    fetchStatsData();
    fetchLocationData();
    fetchTrendsData();
  }, [filterState, filterDistrict]);

  const fetchBiomassData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterState) params.append('state', filterState);
      if (filterDistrict) params.append('district', filterDistrict);
      
      const response = await fetch(`${API_URL}/biomass/biomass-usage?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setBiomassData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching biomass data:', error);
      setBiomassData([]);
    }
    setLoading(false);
  };

  const fetchStatsData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterState) params.append('state', filterState);
      if (filterDistrict) params.append('district', filterDistrict);
      
      const response = await fetch(`${API_URL}/biomass/biomass-stats?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setStatsData(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsData({});
    }
  };

  const fetchLocationData = async () => {
    try {
      const response = await fetch(`${API_URL}/biomass/biomass-by-location?groupBy=state`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setLocationData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching location data:', error);
      setLocationData([]);
    }
  };

  const fetchTrendsData = async () => {
    try {
      const response = await fetch(`${API_URL}/biomass/biomass-trends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setTrendsData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      setTrendsData([]);
    }
  };

  // Prepare chart data for Pie Chart
  const pieChartData = {
    labels: biomassData.map(item => item.species.charAt(0).toUpperCase() + item.species.slice(1)),
    datasets: [{
      label: 'Biomass (KG)',
      data: biomassData.map(item => parseFloat(item.biomass_kg) || 0),
      backgroundColor: biomassData.map(item => speciesColors[item.species] || '#9E9E9E'),
      borderColor: '#fff',
      borderWidth: 2
    }]
  };

  // Prepare chart data for Bar Chart
  const barChartData = {
    labels: biomassData.map(item => item.species.charAt(0).toUpperCase() + item.species.slice(1)),
    datasets: [{
      label: 'Biomass (KG)',
      data: biomassData.map(item => parseFloat(item.biomass_kg) || 0),
      backgroundColor: biomassData.map(item => speciesColors[item.species] || '#9E9E9E'),
      borderColor: biomassData.map(item => speciesColors[item.species] || '#9E9E9E'),
      borderWidth: 2
    }]
  };

  // Chart options with custom tooltip
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: { size: 12 },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const item = biomassData[i];
                return {
                  text: `${label}: ${value} kg (${item?.treatment_count || 0} treatments)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const item = biomassData[index];
            const species = item?.species || '';
            const biomass = parseFloat(item?.biomass_kg || 0).toFixed(2);
            const count = item?.treatment_count || 0;
            return [
              `Species: ${species.charAt(0).toUpperCase() + species.slice(1)}`,
              `Biomass: ${biomass} KG`,
              `Treatments: ${count}`
            ];
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        bodySpacing: 6
      }
    }
  };

  // Bar chart specific options
  const barChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Biomass (KG)',
          font: { size: 14, weight: 'bold' }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Species',
          font: { size: 14, weight: 'bold' }
        }
      }
    }
  };

  // Monthly trends chart
  const monthlyTrendsData = {
    labels: [...new Set(trendsData.map(item => item.month))].slice(0, 6).reverse(),
    datasets: ['cattle', 'goat', 'sheep', 'pig', 'poultry'].map(species => ({
      label: species.charAt(0).toUpperCase() + species.slice(1),
      data: [...new Set(trendsData.map(item => item.month))].slice(0, 6).reverse().map(month => {
        const found = trendsData.find(t => t.month === month && t.species === species);
        return found ? parseFloat(found.biomass_kg) : 0;
      }),
      backgroundColor: speciesColors[species],
      borderColor: speciesColors[species],
      borderWidth: 2
    }))
  };

  const trendsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Monthly Biomass Trends (Last 6 Months)',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Biomass (KG)',
          font: { size: 12 }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Month',
          font: { size: 12 }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthorityNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Biomass-Based AMU Usage</h1>
          <p className="text-gray-600">
            Analyze antimicrobial usage based on animal biomass across species
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Total Biomass</div>
            <div className="text-3xl font-bold text-blue-600">
              {parseFloat(statsData.total_biomass_kg || 0).toLocaleString()} KG
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">Total Treatments</div>
            <div className="text-3xl font-bold text-green-600">
              {parseInt(statsData.total_treatments || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Total Farms</div>
            <div className="text-3xl font-bold text-orange-600">
              {parseInt(statsData.total_farms || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600 mb-1">Avg Animal Weight</div>
            <div className="text-3xl font-bold text-purple-600">
              {parseFloat(statsData.avg_animal_weight || 0).toFixed(1)} KG
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                placeholder="Enter state name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              <input
                type="text"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                placeholder="Enter district name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterState('');
                  setFilterDistrict('');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Species-Wise Biomass Distribution</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('pie')}
                className={`px-4 py-2 rounded-lg transition ${
                  chartType === 'pie' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pie Chart
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-4 py-2 rounded-lg transition ${
                  chartType === 'bar' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            </div>
          ) : biomassData.length > 0 ? (
            <div style={{ height: '400px' }}>
              {chartType === 'pie' ? (
                <Pie data={pieChartData} options={chartOptions} />
              ) : (
                <Bar data={barChartData} options={barChartOptions} />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No biomass data available
            </div>
          )}
        </div>

        {/* Monthly Trends */}
        {trendsData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Monthly Biomass Trends</h2>
            <div style={{ height: '400px' }}>
              <Bar data={monthlyTrendsData} options={trendsChartOptions} />
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Detailed Biomass Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Species
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Biomass (KG)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatment Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {biomassData.map((item, index) => {
                  const totalBiomass = biomassData.reduce((sum, d) => sum + parseFloat(d.biomass_kg || 0), 0);
                  const percentage = totalBiomass > 0 ? ((parseFloat(item.biomass_kg) / totalBiomass) * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: speciesColors[item.species] }}
                          ></div>
                          <span className="font-medium capitalize">{item.species}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-semibold">
                        {parseFloat(item.biomass_kg).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseInt(item.treatment_count).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2" style={{ width: '100px' }}>
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: speciesColors[item.species]
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Location-wise Distribution */}
        {locationData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6">State-Wise Biomass Distribution (Top 20)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Biomass (KG)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Treatment Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locationData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {item.state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-semibold text-blue-600">
                        {parseFloat(item.biomass_kg).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseInt(item.treatment_count).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiomassUsageAnalytics;
