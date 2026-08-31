import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Maximize, Layers, Trash2 } from 'lucide-react';
import api from '../api';

const FarmDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [farm, setFarm] = useState(null);
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newField, setNewField] = useState({ name: '', area: '', area_unit: 'acres', soil_type: '', irrigation_type: 'Rainfed', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [farmRes, fieldsRes, cropsRes] = await Promise.all([
        api.get(`/farms/${id}`),
        api.get(`/fields/`, { params: { farm_id: id } }),
        api.get(`/crops/`, { params: { farm_id: id } })
      ]);
      setFarm(farmRes.data);
      setFields(fieldsRes.data);
      setCrops(cropsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response && (error.response.status === 404 || error.response.status === 403)) {
        navigate('/farms');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/fields/`, {
        name: newField.name,
        area: parseFloat(newField.area),
        area_unit: newField.area_unit,
        soil_type: newField.soil_type,
        irrigation_type: newField.irrigation_type,
        description: newField.description
      }, {
        params: { farm_id: id } // Using query params as per refactored route
      });
      setFields([...fields, res.data]);
      setIsModalOpen(false);
      setNewField({ name: '', area: '', area_unit: 'acres', soil_type: '', irrigation_type: 'Rainfed', description: '' });
    } catch (error) {
      console.error('Failed to create field:', error);
      alert('Failed to create field. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (e, fieldId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    
    try {
      await api.delete(`/fields/${fieldId}`);
      setFields(fields.filter(f => f._id !== fieldId));
    } catch (error) {
      console.error('Failed to delete field:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        alert(error.response.data.detail);
      } else {
        alert('Failed to delete field.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!farm) return null;

  return (
    <div>
      <div className="mb-6">
        <Link to="/farms" className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
      </div>

      {/* Farm Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8 border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl leading-6 font-bold text-gray-900">{farm.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{farm.description || 'Farm Details'}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-gray-400" /> Location
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{farm.location}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Maximize className="mr-2 h-4 w-4 text-gray-400" /> Area
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{farm.total_area} {farm.area_unit || 'units'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Crop Summary */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Crop Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Active Crops</h4>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {crops.filter(c => !['harvested', 'sold', 'completed'].includes(c.status)).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Harvested Crops</h4>
            <p className="mt-1 text-2xl font-semibold text-yellow-600">
              {crops.filter(c => c.status === 'harvested').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Completed Crops</h4>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {crops.filter(c => c.status === 'completed' || c.status === 'sold').length}
            </p>
          </div>
        </div>
      </div>

      {/* Fields Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Fields</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fields</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new field.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {fields.map((field) => (
              <li key={field._id}>
                <Link to={`/fields/${field._id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-green-600 truncate">{field.name}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {field.area} {field.area_unit || 'units'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Layers className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            Soil: {field.soil_type || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteField(e, field._id)}
                      className="ml-5 flex-shrink-0 text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateField}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Layers className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Field</h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Field Name</label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={newField.name}
                            onChange={(e) => setNewField({...newField, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Area</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={newField.area}
                            onChange={(e) => setNewField({...newField, area: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Area Unit</label>
                          <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                            value={newField.area_unit}
                            onChange={(e) => setNewField({...newField, area_unit: e.target.value})}
                          >
                            <option value="acres">Acres</option>
                            <option value="hectares">Hectares</option>
                            <option value="sq_meters">Square Meters</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Soil Type</label>
                          <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                            value={newField.soil_type}
                            onChange={(e) => setNewField({...newField, soil_type: e.target.value})}
                          >
                            <option value="">Select Soil Type</option>
                            <option value="Loamy">Loamy</option>
                            <option value="Clay">Clay</option>
                            <option value="Sandy">Sandy</option>
                            <option value="Silty">Silty</option>
                            <option value="Black Soil">Black Soil</option>
                            <option value="Red Soil">Red Soil</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Irrigation Type</label>
                          <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                            value={newField.irrigation_type}
                            onChange={(e) => setNewField({...newField, irrigation_type: e.target.value})}
                          >
                            <option value="Rainfed">Rainfed</option>
                            <option value="Drip">Drip</option>
                            <option value="Sprinkler">Sprinkler</option>
                            <option value="Canal">Canal</option>
                            <option value="Well">Well</option>
                            <option value="Borewell">Borewell</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            rows="2"
                            value={newField.description}
                            onChange={(e) => setNewField({...newField, description: e.target.value})}
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

export default FarmDetails;
