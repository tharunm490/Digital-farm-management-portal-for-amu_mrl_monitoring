import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Navigation from '../components/Navigation';
import Chatbot from '../components/Chatbot';
import Weather from '../components/Weather';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getWeatherLocation = () => {
    if (user?.state && user?.district) {
      return `${user.district}, ${user.state}`;
    }
    return 'Delhi, India';
  };

  const renderFarmerDashboard = () => (
    <>
      {/* My Farms - Primary Action Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-green-100" 
        onClick={() => navigate('/farms')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              🏡
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">View All</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('my_farms')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('view_manage_farms')}</p>
        </div>
      </div>

      {/* Add Farm - CTA Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-blue-100" 
        onClick={() => navigate('/add-farm')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              ➕
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">New</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('add_farm')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('register_new_farm')}</p>
        </div>
      </div>

      {/* Animals Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-amber-100" 
        onClick={() => navigate('/animals')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              🐄
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">Manage</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('animals')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('manage_animal_records')}</p>
        </div>
      </div>

      {/* Treatments Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-purple-100" 
        onClick={() => navigate('/treatments')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              💊
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">Track</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('treatments')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('record_track_treatments')}</p>
        </div>
      </div>

      {/* QR Codes Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-indigo-100" 
        onClick={() => navigate('/qr-generator')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              📱
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">Generate</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('qr_codes')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('generate_traceability_qr')}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-slate-100" 
        onClick={() => navigate('/profile')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-slate-600 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              👤
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">Settings</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('profile')}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{t('update_information')}</p>
        </div>
      </div>

      <Weather location={getWeatherLocation()} />
    </>
  );

  const renderAuthorityDashboard = () => (
    <>
      {/* Main Dashboard - Analytics Hub */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-indigo-600" 
        onClick={() => navigate('/dashboard')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              📊
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">Overview</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard</h3>
          <p className="text-gray-600 text-sm leading-relaxed">View main analytics dashboard</p>
        </div>
      </div>

      {/* AMU Analytics - Data Center */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-emerald-600" 
        onClick={() => navigate('/amu-analytics')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              📈
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">AMU Data</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AMU Analytics</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Analyze antimicrobial usage data</p>
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"></div>
            </div>
            <span className="text-xs font-semibold text-emerald-600">80%</span>
          </div>
        </div>
      </div>

      {/* Heat Map - Geographic Insights */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-orange-600" 
        onClick={() => navigate('/heat-map')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-orange-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-amber-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              🌡️
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">Regional</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Heat Map</h3>
          <p className="text-gray-600 text-sm leading-relaxed">View usage heat maps</p>
        </div>
      </div>

      {/* India Map - National Overview */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-blue-600" 
        onClick={() => navigate('/india-map')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              🗺️
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Geographic</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">India Map</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Geographic data visualization</p>
        </div>
      </div>

      {/* Complaints & Alerts - Monitoring */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-red-600" 
        onClick={() => navigate('/complaints-alerts')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl animate-pulse">
              🚨
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Active</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Complaints & Alerts</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Manage complaints and alerts</p>
        </div>
      </div>

      {/* Reports - Documentation */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-violet-600" 
        onClick={() => navigate('/reports')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-violet-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              📋
            </div>
            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">Export</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Reports</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Generate compliance reports</p>
        </div>
      </div>

      {/* Notifications - System Alerts */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-yellow-600" 
        onClick={() => navigate('/notifications')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-amber-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              🔔
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Updates</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Notifications</h3>
          <p className="text-gray-600 text-sm leading-relaxed">View system notifications</p>
        </div>
      </div>

      {/* Profile - Settings */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border-t-4 border-slate-600" 
        onClick={() => navigate('/profile')}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-slate-600/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-gray-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-xl">
              👤
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Settings</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Profile</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Update your information</p>
        </div>
      </div>

      <Weather location={getWeatherLocation()} />
    </>
  );

  const renderVeterinarianDashboard = () => (
    <>
      {/* Treatment Requests - Priority Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border-l-4 border-red-500" 
        onClick={() => navigate('/treatment-requests')}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-lg">
              📋
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full mb-1">Urgent</span>
              <span className="text-xs text-gray-500">Requires Review</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Treatment Requests</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Review and approve treatment requests</p>
          <div className="mt-4 flex items-center space-x-2">
            <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-red-500 rounded-full"></div>
            </div>
            <span className="text-xs font-medium text-gray-600">Pending</span>
          </div>
        </div>
      </div>

      {/* Treatments - Medical Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border-l-4 border-blue-500" 
        onClick={() => navigate('/treatments')}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
              💊
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full mb-1">Active</span>
              <span className="text-xs text-gray-500">AMU Monitoring</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Treatments</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Record and track treatments</p>
          <div className="mt-4 flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">MRL Safe</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Withdrawal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Management Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border-l-4 border-purple-500" 
        onClick={() => navigate('/treatment-management')}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
              📋
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-1">Manage</span>
              <span className="text-xs text-gray-500">All Records</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Treatment Management</h3>
          <p className="text-gray-600 text-sm leading-relaxed">View and manage all treatment records</p>
          <div className="mt-4 flex items-center space-x-2">
            <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-purple-500 rounded-full"></div>
            </div>
            <span className="text-xs font-medium text-gray-600">2/3 Complete</span>
          </div>
        </div>
      </div>

      {/* Vaccinations - Healthcare Card */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border-l-4 border-green-500" 
        onClick={() => navigate('/vaccinations')}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              💉
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full mb-1">Schedule</span>
              <span className="text-xs text-gray-500">Prevention</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Vaccinations</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Manage vaccination schedules</p>
          <div className="mt-4 flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-gray-600">Up to date</span>
          </div>
        </div>
      </div>

      {/* Profile Card - Professional */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border-l-4 border-slate-500" 
        onClick={() => navigate('/profile')}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-slate-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-gray-700 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-lg">
              👤
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">Settings</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Profile</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Update your information</p>
        </div>
      </div>

      <Weather location={getWeatherLocation()} />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {user?.role === 'farmer' && renderFarmerDashboard()}
          {user?.role === 'authority' && renderAuthorityDashboard()}
          {user?.role === 'veterinarian' && renderVeterinarianDashboard()}
        </div>
      </div>

      <Chatbot />
    </div>
  );
};

export default Dashboard;
