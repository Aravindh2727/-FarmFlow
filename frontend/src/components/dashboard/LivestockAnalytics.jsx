import React, { useState, useEffect } from 'react';
import api from '../../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const LivestockAnalytics = ({ filters }) => {
  const [data, setData] = useState({ types_distribution: [], upcoming_vaccinations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/dashboard/livestock', { params: { farm_id: filters.farm_id } });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching livestock analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-80 bg-gray-100 animate-pulse rounded-xl mb-8"></div>;
  }

  if (error) return null;

  const getVaccinationStatus = (dueDate) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: 'text-rose-600', bg: 'bg-rose-100', icon: AlertCircle };
    if (diffDays === 0) return { label: 'Today', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock };
    return { label: `In ${diffDays} days`, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Livestock Types Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Livestock Distribution</h3>
        {data.types_distribution.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            No active livestock recorded
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.types_distribution} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#4b5563' }} width={80} />
                <RechartsTooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} barSize={30}>
                  {data.types_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Upcoming Vaccinations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[328px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Vaccinations</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {data.upcoming_vaccinations.length} Scheduled
          </span>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {data.upcoming_vaccinations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No upcoming vaccinations
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.upcoming_vaccinations.map((vac) => {
                const status = getVaccinationStatus(vac.next_due_date);
                const Icon = status.icon;
                return (
                  <li key={vac._id} className="p-4 hover:bg-gray-50 transition-colors rounded-lg mx-2 my-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${status.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{vac.vaccine_name}</p>
                          <p className="text-xs text-gray-500">{vac.animal_type} • {vac.animal_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${status.color}`}>{status.label}</p>
                        <p className="text-xs text-gray-500">{new Date(vac.next_due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivestockAnalytics;
