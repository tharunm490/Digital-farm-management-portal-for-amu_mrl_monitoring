import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AuthorityNavigation from '../../components/AuthorityNavigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EnhancedAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [categoryUsage, setCategoryUsage] = useState([]);
  const [speciesUsage, setSpeciesUsage] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [insights, setInsights] = useState([]);
  const [stateUsage, setStateUsage] = useState([]);
  const [districtUsage, setDistrictUsage] = useState([]);
  const [withdrawalCompliance, setWithdrawalCompliance] = useState(null);
  const [riskyFarms, setRiskyFarms] = useState([]);
  const [residueTrends, setResidueTrends] = useState([]);
  const [matrixUsage, setMatrixUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const dashboardRef = useRef(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const headers = { Authorization: `Bearer ${token}` };

      const [
        overviewRes,
        categoryRes,
        speciesRes,
        trendsRes,
        reportsRes,
        insightsRes,
        stateRes,
        districtRes,
        complianceRes,
        riskyRes,
        residueRes,
        matrixRes
      ] = await Promise.all([
        fetch(`${API_URL}/analytics/overview`, { headers }),
        fetch(`${API_URL}/analytics/category-usage`, { headers }),
        fetch(`${API_URL}/analytics/species-usage`, { headers }),
        fetch(`${API_URL}/analytics/monthly-trends`, { headers }),
        fetch(`${API_URL}/analytics/lab-reports-status`, { headers }),
        fetch(`${API_URL}/analytics/insights`, { headers }),
        fetch(`${API_URL}/analytics/state-usage`, { headers }),
        fetch(`${API_URL}/analytics/district-usage`, { headers }),
        fetch(`${API_URL}/analytics/withdrawal-compliance`, { headers }),
        fetch(`${API_URL}/analytics/risky-farms`, { headers }),
        fetch(`${API_URL}/analytics/residue-trends`, { headers }),
        fetch(`${API_URL}/analytics/matrix-usage`, { headers })
      ]);

      const overviewData = await overviewRes.json();
      const categoryData = await categoryRes.json();
      const speciesData = await speciesRes.json();
      const trendsData = await trendsRes.json();
      const reportsData = await reportsRes.json();
      const insightsData = await insightsRes.json();
      const stateData = await stateRes.json();
      const districtData = await districtRes.json();
      const complianceData = await complianceRes.json();
      const riskyData = await riskyRes.json();
      const residueData = await residueRes.json();
      const matrixData = await matrixRes.json();

      setOverview(overviewData);
      setCategoryUsage(Array.isArray(categoryData) ? categoryData : []);
      setSpeciesUsage(Array.isArray(speciesData) ? speciesData : []);
      setMonthlyTrends(Array.isArray(trendsData) ? trendsData.reverse() : []);
      setLabReports(Array.isArray(reportsData) ? reportsData : []);
      setInsights(Array.isArray(insightsData) ? insightsData : []);
      setStateUsage(Array.isArray(stateData) ? stateData : []);
      setDistrictUsage(Array.isArray(districtData) ? districtData : []);
      setWithdrawalCompliance(complianceData);
      setRiskyFarms(Array.isArray(riskyData) ? riskyData : []);
      setResidueTrends(Array.isArray(residueData) ? residueData.reverse() : []);
      setMatrixUsage(Array.isArray(matrixData) ? matrixData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  // Animated Counter Component
  const AnimatedCounter = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const end = parseInt(value);
      if (start === end) return;

      const incrementTime = Math.floor(duration / end);
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= end) clearInterval(timer);
      }, incrementTime);

      return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{count.toLocaleString()}</span>;
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExportLoading(true);
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
    setExportLoading(false);
  };

  // Export to PNG
  const exportToPNG = async () => {
    setExportLoading(true);
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const link = document.createElement('a');
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export PNG. Please try again.');
    }
    setExportLoading(false);
  };

  // Chart Data
  const categoryChartData = {
    labels: categoryUsage.map(item => item.category || 'Unknown'),
    datasets: [{
      label: 'Usage Count',
      data: categoryUsage.map(item => item.usage_count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)',
      ],
      borderWidth: 2,
    }]
  };

  const speciesChartData = {
    labels: speciesUsage.map(item => item.species),
    datasets: [{
      label: 'Treatment Count',
      data: speciesUsage.map(item => item.treatment_count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(251, 191, 36, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(236, 72, 153, 0.7)',
      ],
    }]
  };

  const monthlyTrendsData = {
    labels: monthlyTrends.map(item => item.month),
    datasets: [{
      label: 'AMU Records',
      data: monthlyTrends.map(item => item.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  const labReportsData = {
    labels: labReports.map(item => item.final_status || 'Unknown'),
    datasets: [{
      data: labReports.map(item => item.total),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
      ],
      borderWidth: 2,
    }]
  };

  const stateUsageData = {
    labels: stateUsage.slice(0, 10).map(item => item.state),
    datasets: [{
      label: 'AMU Usage',
      data: stateUsage.slice(0, 10).map(item => item.usage),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
    }]
  };

  const residueTrendsData = {
    labels: residueTrends.map(item => item.month),
    datasets: [
      {
        label: 'Avg Residue',
        data: residueTrends.map(item => item.avg_residue),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Max Residue',
        data: residueTrends.map(item => item.max_residue),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const matrixUsageData = {
    labels: matrixUsage.map(item => item.matrix),
    datasets: [{
      data: matrixUsage.map(item => item.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 191, 36, 0.8)',
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(239, 68, 68)',
        'rgb(251, 191, 36)',
      ],
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const getInsightStyle = (type) => {
    const styles = {
      warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      danger: 'bg-red-50 border-red-300 text-red-800',
      info: 'bg-blue-50 border-blue-300 text-blue-800',
    };
    return styles[type] || 'bg-gray-50 border-gray-300 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <AuthorityNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium text-lg">Loading Analytics Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AuthorityNavigation />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <span className="text-5xl">📊</span>
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">Comprehensive antimicrobial usage and compliance monitoring</p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-3">
            <button
              onClick={exportToPNG}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              📸 Export PNG
            </button>
            <button
              onClick={exportToPDF}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'antibiotic-usage', label: 'Antibiotic Usage Trends', icon: '💊' },
              { id: 'withdrawal', label: 'Withdrawal Compliance', icon: '📅' },
              { id: 'lab-reports', label: 'Laboratory Reports', icon: '🧪' },
              { id: 'map', label: 'AMU State Heat Map', icon: '🗺️' },
              { id: 'farms', label: 'Farm-Level Insights', icon: '🏡' },
              { id: 'downloads', label: 'Downloads', icon: '📥' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={dashboardRef}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats with Animated Counters */}
              {overview && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm opacity-90">Total AMU Records</p>
                      <span className="text-4xl">💊</span>
                    </div>
                    <p className="text-4xl font-bold">
                      <AnimatedCounter value={overview.total_amu_records} />
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm opacity-90">Total Farms</p>
                      <span className="text-4xl">🏡</span>
                    </div>
                    <p className="text-4xl font-bold">
                      <AnimatedCounter value={overview.total_farms} />
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm opacity-90">Lab Reports</p>
                      <span className="text-4xl">🧪</span>
                    </div>
                    <p className="text-4xl font-bold">
                      <AnimatedCounter value={overview.total_lab_reports} />
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm opacity-90">Unsafe Reports</p>
                      <span className="text-4xl">⚠️</span>
                    </div>
                    <p className="text-4xl font-bold">
                      <AnimatedCounter value={overview.unsafe_reports} />
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm opacity-90">Pending Samples</p>
                      <span className="text-4xl">⏳</span>
                    </div>
                    <p className="text-4xl font-bold">
                      <AnimatedCounter value={overview.pending_samples} />
                    </p>
                  </div>
                </div>
              )}

              {/* Automated Insights */}
              {insights.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    Automated Insights
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.map((insight, index) => (
                      <div key={index} className={`p-5 rounded-xl border-2 shadow-md ${getInsightStyle(insight.type)}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{insight.icon}</span>
                          <p className="font-medium text-sm">{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Usage */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Antibiotic Category Usage
                  </h3>
                  <div className="h-80">
                    <Bar data={categoryChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Species Usage */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🥧</span>
                    Species-Wise Treatment
                  </h3>
                  <div className="h-80 flex items-center justify-center">
                    <Pie data={speciesChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    Monthly AMU Trends
                  </h3>
                  <div className="h-80">
                    <Line data={monthlyTrendsData} options={chartOptions} />
                  </div>
                </div>

                {/* Lab Reports Status */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🧪</span>
                    Lab Report Status Distribution
                  </h3>
                  <div className="h-80 flex items-center justify-center">
                    <Doughnut data={labReportsData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Antibiotic Usage Tab */}
          {activeTab === 'antibiotic-usage' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Category-wise Usage</h3>
                  <div className="h-96">
                    <Bar data={categoryChartData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Matrix Distribution (Milk/Meat/Egg)</h3>
                  <div className="h-96 flex items-center justify-center">
                    <Pie data={matrixUsageData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Monthly Antibiotic Trends</h3>
                  <div className="h-96">
                    <Line data={monthlyTrendsData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Category Table */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Category Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {categoryUsage.map((item, index) => {
                        const total = categoryUsage.reduce((sum, i) => sum + i.usage_count, 0);
                        const percentage = ((item.usage_count / total) * 100).toFixed(1);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{item.category || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.usage_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Compliance Tab */}
          {activeTab === 'withdrawal' && withdrawalCompliance && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border-2 border-green-300 rounded-xl shadow-lg p-6">
                  <p className="text-sm text-green-700 mb-2">Compliant Samples</p>
                  <p className="text-4xl font-bold text-green-800">
                    {withdrawalCompliance.compliant || 0}
                  </p>
                </div>
                <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6">
                  <p className="text-sm text-red-700 mb-2">Non-Compliant Samples</p>
                  <p className="text-4xl font-bold text-red-800">
                    {withdrawalCompliance.non_compliant || 0}
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow-lg p-6">
                  <p className="text-sm text-blue-700 mb-2">Compliance Rate</p>
                  <p className="text-4xl font-bold text-blue-800">
                    {withdrawalCompliance.compliance_rate || 0}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Residue Detection Trends</h3>
                <div className="h-96">
                  <Line data={residueTrendsData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Laboratory Reports Tab */}
          {activeTab === 'lab-reports' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Report Status Distribution</h3>
                  <div className="h-96 flex items-center justify-center">
                    <Doughnut data={labReportsData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Status Breakdown</h3>
                  <div className="space-y-4">
                    {labReports.map((report, index) => {
                      const total = labReports.reduce((sum, r) => sum + r.total, 0);
                      const percentage = ((report.total / total) * 100).toFixed(1);
                      const colorClass = report.final_status === 'safe' ? 'bg-green-500' :
                                        report.final_status === 'unsafe' ? 'bg-red-500' : 'bg-yellow-500';
                      return (
                        <div key={index} className="border-l-4 pl-4" style={{ borderColor: colorClass.replace('bg-', '') }}>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-lg capitalize">{report.final_status}</span>
                            <span className="text-2xl font-bold">{report.total}</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                            <div className={`${colorClass} h-3 rounded-full`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{percentage}% of total reports</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Tab */}
          {activeTab === 'map' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">State-wise AMU Distribution</h3>
                <div className="h-96">
                  <Bar data={stateUsageData} options={chartOptions} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Top 10 States by AMU Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stateUsage.slice(0, 10).map((state, index) => {
                    const maxUsage = Math.max(...stateUsage.map(s => s.usage));
                    const widthPercentage = (state.usage / maxUsage) * 100;
                    return (
                      <div key={index} className="p-4 border rounded-lg hover:shadow-md transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{state.state}</span>
                          <span className="text-lg font-bold text-blue-600">{state.usage}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${widthPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Link to interactive map */}
              <Link
                to="/authority/map-view"
                className="block bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition"
              >
                <span className="text-6xl mb-4 block">🗺️</span>
                <h3 className="text-2xl font-bold mb-2">View Interactive India Map</h3>
                <p className="text-blue-100">Click to see detailed geographical heat map visualization</p>
              </Link>
            </div>
          )}

          {/* Farm-Level Insights Tab */}
          {activeTab === 'farms' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  High-Risk Farms
                </h3>
                {riskyFarms.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Farm Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Unsafe Reports</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Max Residue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {riskyFarms.map((farm, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 font-bold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium">{farm.farm_name}</td>
                            <td className="px-6 py-4">{farm.district}, {farm.state}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                                {farm.unsafe_reports}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-red-600">
                              {parseFloat(farm.max_residue).toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No high-risk farms identified</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Species Distribution</h3>
                <div className="h-96">
                  <Pie data={speciesChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Downloads Tab */}
          {activeTab === 'downloads' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <span className="text-6xl mb-4 block">📥</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Analytics Report</h2>
                <p className="text-gray-600 mb-6">Download the complete analytics dashboard as PDF or PNG</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={exportToPNG}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-lg font-semibold"
                  >
                    <span className="text-2xl">📸</span>
                    Export as PNG
                  </button>
                  <button
                    onClick={exportToPDF}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-lg font-semibold"
                  >
                    <span className="text-2xl">📄</span>
                    Export as PDF
                  </button>
                </div>
                {exportLoading && (
                  <p className="mt-4 text-blue-600 font-medium">Generating export...</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <span className="text-4xl mb-3 block">📊</span>
                  <h4 className="font-bold text-gray-900 mb-2">Dashboard Overview</h4>
                  <p className="text-sm text-gray-600">Complete analytics dashboard with all charts and insights</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <span className="text-4xl mb-3 block">🧪</span>
                  <h4 className="font-bold text-gray-900 mb-2">Lab Reports</h4>
                  <p className="text-sm text-gray-600">Detailed laboratory test results and compliance data</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                  <span className="text-4xl mb-3 block">🗺️</span>
                  <h4 className="font-bold text-gray-900 mb-2">Geographic Data</h4>
                  <p className="text-sm text-gray-600">State and district-wise AMU distribution patterns</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;
