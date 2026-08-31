import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tractor, Plus, MapPin, Maximize, Trash2 } from 'lucide-react';
import api from '../api';

const Farms = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFarm, setNewFarm] = useState({ name: '', location: '', total_area: '', area_unit: 'acres', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ fields: [], crops: [] });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const [farmsRes, fieldsRes, cropsRes] = await Promise.all([
        api.get('/farms/'),
        api.get('/fields/'),
        api.get('/crops/')
      ]);
      setFarms(farmsRes.data);
      setStats({ fields: fieldsRes.data, crops: cropsRes.data });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/farms/', {
        name: newFarm.name,
        location: newFarm.location,
        total_area: parseFloat(newFarm.total_area),
        area_unit: newFarm.area_unit,
        description: newFarm.description
      });
      setFarms([...farms, res.data]);
      setIsModalOpen(false);
      setNewFarm({ name: '', location: '', total_area: '', area_unit: 'acres', description: '' });
    } catch (error) {
      console.error('Failed to create farm:', error);
      alert('Failed to create farm. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this farm and all its fields and crops?')) return;
    
    try {
      await api.delete(`/farms/${id}`);
      setFarms(farms.filter(f => f._id !== id));
    } catch (error) {
      console.error('Failed to delete farm:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        alert(error.response.data.detail);
      } else {
        alert('Failed to delete farm.');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Farms</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Farm
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : farms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Tractor className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No farms</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new farm.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Farm
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <Link key={farm._id} to={`/farms/${farm._id}`} className="block">
              <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="px-4 py-5 sm:p-6 flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{farm.name}</h3>
                    <button 
                      onClick={(e) => handleDelete(e, farm._id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <dd className="truncate">{farm.location}</dd>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Maximize className="h-4 w-4 mr-2 text-gray-400" />
                      <dd>{farm.total_area} {farm.area_unit}</dd>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span>Fields: {stats.fields.filter(f => f.farm_id === farm._id).length}</span>
                      <span>Active Crops: {stats.crops.filter(c => c.farm_id === farm._id && !['harvested', 'sold', 'completed'].includes(c.status)).length}</span>
                    </div>
                  </dl>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 mt-auto border-t border-gray-100">
                  <div className="text-sm">
                    <span className="font-medium text-green-600 hover:text-green-500">View details &rarr;</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateFarm}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Tractor className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Farm</h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Farm Name</label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={newFarm.name}
                            onChange={(e) => setNewFarm({...newFarm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location</label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={newFarm.location}
                            onChange={(e) => setNewFarm({...newFarm, location: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Area</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={newFarm.total_area}
                            onChange={(e) => setNewFarm({...newFarm, total_area: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Area Unit</label>
                          <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                            value={newFarm.area_unit}
                            onChange={(e) => setNewFarm({...newFarm, area_unit: e.target.value})}
                          >
                            <option value="acres">Acres</option>
                            <option value="hectares">Hectares</option>
                            <option value="sq_meters">Square Meters</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            rows="3"
                            value={newFarm.description}
                            onChange={(e) => setNewFarm({...newFarm, description: e.target.value})}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Farms;
