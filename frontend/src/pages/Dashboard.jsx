import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Brain, ArrowRight, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import KpiCards from '../components/dashboard/KpiCards';
import FinanceCharts from '../components/dashboard/FinanceCharts';
import CropAnalytics from '../components/dashboard/CropAnalytics';
import LivestockAnalytics from '../components/dashboard/LivestockAnalytics';
import RecentActivity from '../components/dashboard/RecentActivity';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  
  const [filters, setFilters] = useState({
    farm_id: '',
    start_date: null,
    end_date: null
  });

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-green-600" />
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}. Here's what's happening on your farms.</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <div className="rounded-full bg-white/20 p-3">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">New: Predictive AI Insights</h2>
            <p className="text-purple-100 text-sm mt-1">Forecast your crop yields, predict profits, and detect expense anomalies instantly.</p>
          </div>
        </div>
        <Link to="/ai" className="whitespace-nowrap flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50">
          Try AI Models <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <DashboardFilters filters={filters} setFilters={setFilters} />
      
      <KpiCards filters={filters} />
      
      <FinanceCharts filters={filters} />
      
      <CropAnalytics filters={filters} />
      
      <LivestockAnalytics filters={filters} />
      
      {/* Quick Reports Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Reports</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Generate PDF and CSV reports of your farm data.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/reports" className="whitespace-nowrap flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            Generate Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <RecentActivity filters={filters} />
      
    </div>
  );
};

export default Dashboard;
