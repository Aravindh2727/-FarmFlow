import { useState, useEffect } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import api from '../../api';

const DashboardFilters = ({ filters, setFilters }) => {
  const [farms, setFarms] = useState([]);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const res = await api.get('/farms/');
      setFarms(res.data);
    } catch (error) {
      console.error('Failed to fetch farms for filters', error);
    }
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_30_days':
        start.setDate(today.getDate() - 30);
        break;
      case 'this_year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'all_time':
        start = null;
        end = null;
        break;
      default:
        break;
    }

    setFilters({
      ...filters,
      start_date: start ? start.toISOString() : null,
      end_date: end ? end.toISOString() : null
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      
      {/* Farm Filter */}
      <div className="flex items-center w-full sm:w-auto">
        <MapPin className="h-5 w-5 text-gray-400 mr-2" />
        <select
          className="block w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          value={filters.farm_id}
          onChange={(e) => setFilters({ ...filters, farm_id: e.target.value })}
        >
          <option value="">All Farms</option>
          {farms.map(f => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Date Filters */}
      <div className="flex items-center w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <Calendar className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
        <div className="flex space-x-2">
          <button onClick={() => handleDatePreset('all_time')} className="px-3 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap">All Time</button>
          <button onClick={() => handleDatePreset('this_month')} className="px-3 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap">This Month</button>
          <button onClick={() => handleDatePreset('last_30_days')} className="px-3 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap">Last 30 Days</button>
          <button onClick={() => handleDatePreset('this_year')} className="px-3 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap">This Year</button>
        </div>
      </div>
      
    </div>
  );
};

export default DashboardFilters;
