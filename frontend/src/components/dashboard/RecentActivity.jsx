import React, { useState, useEffect } from 'react';
import api from '../../api';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Activity, 
  Milk, 
  TrendingDown, 
  TrendingUp,
  History
} from 'lucide-react';

const RecentActivity = ({ filters }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/dashboard/recent-activity', { params: { farm_id: filters.farm_id, limit: 10 } });
      setActivities(res.data);
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown Date';
    const date = new Date(isoString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (type, isIncome) => {
    if (type === 'Expense') return <TrendingDown className="h-5 w-5 text-rose-500" />;
    if (type === 'Income') return <TrendingUp className="h-5 w-5 text-emerald-500" />;
    if (type === 'Livestock Production') return <Milk className="h-5 w-5 text-blue-500" />;
    return <Activity className="h-5 w-5 text-indigo-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 w-48 mb-6 rounded"></div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 w-3/4 mb-2 rounded"></div>
              <div className="h-3 bg-gray-200 w-1/4 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <History className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No recent activity found. Add expenses, income, or activities to see them here.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {activities.map((item, idx) => (
            <li key={`${item.id}-${idx}`} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                    ${item.is_income ? 'bg-emerald-100' : (item.type === 'Activity' ? 'bg-indigo-100' : 'bg-rose-100')}`}
                  >
                    {getIcon(item.type, item.is_income)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      {item.type} • {formatDate(item.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {item.amount > 0 && (
                    <div className={`flex items-center justify-end text-sm font-bold ${item.is_income ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.is_income ? '+' : '-'}{formatCurrency(item.amount)}
                      {item.is_income ? <ArrowUpRight className="h-4 w-4 ml-0.5" /> : <ArrowDownRight className="h-4 w-4 ml-0.5" />}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentActivity;
