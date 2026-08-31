import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Dog, Plus, Loader2, AlertCircle, Edit, Trash2, Eye } from 'lucide-react';
import LivestockForm from '../components/LivestockForm';

const LivestockList = () => {
  const [livestock, setLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState(null);

  // Filters
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchLivestock = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = '/livestock/';
      const params = new URLSearchParams();
      if (selectedFarm) params.append('farm_id', selectedFarm);
      if (selectedType) params.append('animal_type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      setLivestock(response.data);
    } catch (err) {
      setError('Failed to load livestock data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedFarm, selectedType, selectedStatus]);

  const fetchFarms = async () => {
    try {
      const response = await api.get('/farms/');
      setFarms(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    fetchLivestock();
  }, [fetchLivestock]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this animal? If it has historical records, this will fail.')) {
      try {
        await api.delete(`/livestock/${id}`);
        fetchLivestock();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete animal');
      }
    }
  };

  const handleEdit = (animal) => {
    setEditingAnimal(animal);
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'deceased': return 'bg-red-100 text-red-800';
      case 'transferred': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Dog className="mr-2 h-6 w-6 text-green-600" />
          Livestock Management
        </h1>
        <button
          onClick={() => {
            setEditingAnimal(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Livestock
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Farm</label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            <option value="">All Farms</option>
            {farms.map((farm) => (
              <option key={farm._id} value={farm._id}>{farm.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            <option value="">All Types</option>
            <option value="Cow">Cow</option>
            <option value="Buffalo">Buffalo</option>
            <option value="Goat">Goat</option>
            <option value="Sheep">Sheep</option>
            <option value="Poultry">Poultry</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Sold">Sold</option>
            <option value="Deceased">Deceased</option>
            <option value="Transferred">Transferred</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3 text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : livestock.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
          <Dog className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No livestock found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your animals to track feed, health, and production.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingAnimal(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Livestock
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {livestock.map((animal) => {
            const farm = farms.find(f => f._id === animal.farm_id);
            return (
              <div key={animal._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{animal.animal_id}</h3>
                      <p className="text-sm text-gray-500">{animal.animal_type} {animal.breed ? `- ${animal.breed}` : ''}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(animal.status)}`}>
                      {animal.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-700">Farm:</span> {farm?.name || 'Unknown'}</p>
                    <p><span className="font-medium text-gray-700">Gender:</span> {animal.gender}</p>
                    <p><span className="font-medium text-gray-700">Purchased:</span> {animal.purchase_date ? new Date(animal.purchase_date).toLocaleDateString() : 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Cost:</span> ₹{(animal.purchase_cost != null ? Number(animal.purchase_cost) : 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Link 
                    to={`/livestock/${animal._id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors tooltip"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button 
                    onClick={() => handleEdit(animal)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors tooltip"
                    title="Edit Animal"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(animal._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip"
                    title="Delete Animal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <LivestockForm 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchLivestock();
          }}
          animal={editingAnimal}
          farms={farms}
        />
      )}
    </div>
  );
};

export default LivestockList;
