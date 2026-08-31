import React, { useState, useEffect } from 'react';
import api from '../../api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';

const STATUS_COLORS = {
  'planned': '#9ca3af',
  'planted': '#60a5fa',
  'growing': '#34d399',
  'ready_for_harvest': '#fbbf24',
  'harvested': '#f97316',
  'sold': '#10b981',
  'completed': '#3b82f6'
};

const CropAnalytics = ({ filters }) => {
  const [data, setData] = useState({ status_distribution: [], profitability: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/dashboard/crops', { params: { farm_id: filters.farm_id } });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching crop analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

  if (loading) {
    return <div className="h-96 bg-gray-100 animate-pulse rounded-xl mb-8"></div>;
  }

  if (error) return null;

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-sm">
          <p className="font-semibold text-gray-800 capitalize">{payload[0].name.replace(/_/g, ' ')}</p>
          <p className="text-gray-600">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Crop Status Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crop Statuses</h3>
        {data.status_distribution.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            No crops recorded
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.status_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={80}
                  dataKey="value"
                >
                  {data.status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="capitalize">{value.replace(/_/g, ' ')}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Crop Profitability Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Crop Profitability</h3>
        </div>
        <div className="flex-1 overflow-auto">
          {data.profitability.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm min-h-[200px]">
              No crop financial data available
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.profitability.slice(0, 5).map((crop) => (
                  <tr key={crop.crop_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{crop.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{crop.status.replace('_', ' ')} • {crop.area} {crop.area_unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-emerald-600 font-medium">
                      {formatCurrency(crop.income)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-rose-600 font-medium">
                      {formatCurrency(crop.expenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${crop.profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {formatCurrency(crop.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropAnalytics;
