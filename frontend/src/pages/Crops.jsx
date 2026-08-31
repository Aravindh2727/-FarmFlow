import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Search, Filter } from 'lucide-react';
import api from '../api';

const Crops = () => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    fetchCrops();
  }, [statusFilter]);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/crops/', { params });
      setCrops(res.data);
    } catch (error) {
      console.error('Failed to fetch crops:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'planted': return 'bg-blue-100 text-blue-800';
      case 'growing': return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_harvest': return 'bg-orange-100 text-orange-800';
      case 'harvested': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-teal-100 text-teal-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-semibold text-gray-900">All Crops</h1>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative rounded-md shadow-sm flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="planted">Planted</option>
              <option value="growing">Growing</option>
              <option value="ready_for_harvest">Ready for Harvest</option>
              <option value="harvested">Harvested</option>
              <option value="sold">Sold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : crops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Sprout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No crops found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or add a new crop to a field.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {crops.map((crop) => (
              <li key={crop._id}>
                <Link to={`/crops/${crop._id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-bold text-green-700 truncate">{crop.name}</p>
                        <span className="ml-2 text-sm text-gray-500 border-l border-gray-300 pl-2">{crop.variety}</span>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(crop.status)}`}>
                          {crop.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex sm:space-x-8">
                        <p className="flex items-center text-sm text-gray-500">
                          Area: {crop.area} {crop.area_unit || 'acres'}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          Planted: {crop.planting_date ? new Date(crop.planting_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Crops;
