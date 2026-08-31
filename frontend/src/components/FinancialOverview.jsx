import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const FinancialOverview = ({ farmId, fieldId, cropId, livestockId }) => {
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, net_profit: 0 });
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      let url = '/finance/summary';
      
      const params = new URLSearchParams();
      if (farmId) params.append('farm_id', farmId);
      if (fieldId) params.append('field_id', fieldId);
      if (cropId) params.append('crop_id', cropId);
      if (livestockId) params.append('livestock_id', livestockId);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await api.get(url);
      setSummary(res.data);
    } catch (error) {
      console.error("Failed to fetch financial summary:", error);
    } finally {
      setLoading(false);
    }
  }, [farmId, fieldId, cropId, livestockId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-xl w-full"></div>;
  }

  const isProfitable = summary.net_profit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Income */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.total_income)}
          </h3>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* Total Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.total_expenses)}
          </h3>
        </div>
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
      </div>

      {/* Net Profit */}
      <div className={`rounded-2xl p-6 shadow-sm border flex items-center justify-between transition-transform hover:scale-[1.02] ${isProfitable ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white' : 'bg-gradient-to-br from-rose-500 to-red-600 border-transparent text-white'}`}>
        <div>
          <p className="text-sm font-medium text-emerald-50 mb-1 opacity-90">Net Profit / Loss</p>
          <h3 className="text-2xl font-bold">
            {formatCurrency(summary.net_profit)}
          </h3>
        </div>
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Wallet className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
