import React, { useState, useEffect } from 'react';
import api from '../../api';
import { 
  Tractor, 
  MapPin, 
  Wheat, 
  PawPrint,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';

const KpiCards = ({ filters }) => {
  const [kpis, setKpis] = useState(null);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (filters.farm_id) params.append('farm_id', filters.farm_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const [kpiRes, finRes] = await Promise.all([
        api.get('/dashboard/kpis', { params: { farm_id: filters.farm_id } }),
        api.get('/finance/summary', { params }) // Reuse phase 4 finance summary
      ]);

      setKpis(kpiRes.data);
      setFinance(finRes.data);
    } catch (err) {
      console.error("Error fetching KPIs:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl"></div>)}
      </div>
    );
  }

  if (error || !kpis || !finance) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-red-600 mb-6 text-sm">
        Failed to load KPI metrics. Please try again.
      </div>
    );
  }

  const isProfitable = finance.net_profit >= 0;

  return (
    <>
      {/* Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Farms</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.total_farms}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Tractor className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Fields</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.total_fields}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Crops</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.active_crops}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
            <Wheat className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Livestock</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.total_livestock}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
            <PawPrint className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(finance.total_income)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(finance.total_expenses)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-rose-600" />
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-sm flex items-center justify-between ${isProfitable ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gradient-to-br from-rose-500 to-red-600 text-white'}`}>
          <div>
            <p className="text-sm font-medium text-white/80 mb-1">Net {isProfitable ? 'Profit' : 'Loss'}</p>
            <h3 className="text-2xl font-bold">{formatCurrency(finance.net_profit)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Wallet className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </>
  );
};

export default KpiCards;
