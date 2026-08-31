import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Layers, Sprout, Trash2, Edit3, Calendar } from 'lucide-react';
import api from '../api';

const FieldDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [field, setField] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', variety: '', status: 'planned', planting_date: '', expected_harvest_date: '',
    area: '', area_unit: 'acres', expected_yield: '', yield_unit: 'kg', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [fieldRes, cropsRes] = await Promise.all([
        api.get(`/fields/${id}`),
        api.get(`/crops`, { params: { field_id: id } })
      ]);
      setField(fieldRes.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Prepare payload
    const payload = {
      name: formData.name,
      variety: formData.variety,
      field_id: id,
      farm_id: field.farm_id,
      area: parseFloat(formData.area),
      area_unit: formData.area_unit,
      status: formData.status,
      planting_date: formData.planting_date ? new Date(formData.planting_date).toISOString() : null,
      expected_harvest_date: formData.expected_harvest_date ? new Date(formData.expected_harvest_date).toISOString() : null,
      expected_yield: formData.expected_yield ? parseFloat(formData.expected_yield) : null,
      yield_unit: formData.yield_unit,
      notes: formData.notes
    };

    try {
      if (editingCrop) {
        const res = await api.put(`/crops/${editingCrop._id}`, payload);
        setCrops(crops.map(c => c._id === editingCrop._id ? res.data : c));
      } else {
        const res = await api.post(`/crops`, payload);
        setCrops([...crops, res.data]);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save crop:', error);
      alert('Failed to save crop. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCrop = async (cropId) => {
    if (!window.confirm('Are you sure you want to delete this crop?')) return;
    try {
      await api.delete(`/crops/${cropId}`);
      setCrops(crops.filter(c => c._id !== cropId));
    } catch (error) {
      console.error('Failed to delete crop:', error);
      alert('Failed to delete crop.');
    }
  };

  const openModal = (crop = null) => {
    if (crop) {
      setEditingCrop(crop);
      setFormData({
        name: crop.name,
        variety: crop.variety,
        status: crop.status,
        planting_date: crop.planting_date ? crop.planting_date.split('T')[0] : '',
        expected_harvest_date: crop.expected_harvest_date ? crop.expected_harvest_date.split('T')[0] : '',
        area: crop.area || '',
        area_unit: crop.area_unit || 'acres',
        expected_yield: crop.expected_yield || '',
        yield_unit: crop.yield_unit || 'kg',
        notes: crop.notes || ''
      });
    } else {
      setEditingCrop(null);
      setFormData({ 
        name: '', variety: '', status: 'planned', planting_date: '', expected_harvest_date: '',
        area: '', area_unit: 'acres', expected_yield: '', yield_unit: 'kg', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCrop(null);
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!field) return null;

  return (
    <div>
      <div className="mb-6">
        <Link to={`/farms/${field.farm_id}`} className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farm
        </Link>
      </div>

      {/* Field Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8 border border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-2xl leading-6 font-bold text-gray-900">{field.name}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{field.description || 'Field Details'}</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Layers className="mr-2 h-4 w-4 text-gray-400" /> Area
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{field.area} {field.area_unit || 'units'}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Sprout className="mr-2 h-4 w-4 text-gray-400" /> Soil Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{field.soil_type || 'Unknown'}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Sprout className="mr-2 h-4 w-4 text-gray-400" /> Irrigation
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{field.irrigation_type || 'Unknown'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Crops Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Crops</h2>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Crop
        </button>
      </div>

      {crops.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Sprout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No crops</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by planning a new crop.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {crops.map((crop) => (
              <li key={crop._id} className="hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-bold text-green-700 truncate">{crop.name}</p>
                      <span className="ml-2 text-sm text-gray-500 border-l border-gray-300 pl-2">{crop.variety}</span>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(crop.status)}`}>
                        {crop.status}
                      </span>
                      <button onClick={() => openModal(crop)} className="text-gray-400 hover:text-green-600">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteCrop(crop._id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-start sm:space-x-8">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      Planted: {crop.planting_date ? new Date(crop.planting_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      Harvest: {crop.expected_harvest_date ? new Date(crop.expected_harvest_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Sprout className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {editingCrop ? 'Edit Crop' : 'Add New Crop'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Crop Name</label>
                            <input
                              type="text"
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Variety</label>
                            <input
                              type="text"
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.variety}
                              onChange={(e) => setFormData({...formData, variety: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Area</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.area}
                              onChange={(e) => setFormData({...formData, area: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Area Unit</label>
                            <select
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                              value={formData.area_unit}
                              onChange={(e) => setFormData({...formData, area_unit: e.target.value})}
                            >
                              <option value="acres">Acres</option>
                              <option value="hectares">Hectares</option>
                              <option value="sq_meters">Square Meters</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                          >
                            <option value="planned">Planned</option>
                            <option value="planted">Planted</option>
                            <option value="growing">Growing</option>
                            <option value="ready_for_harvest">Ready for Harvest</option>
                            <option value="harvested">Harvested</option>
                            <option value="sold">Sold</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Planting Date</label>
                            <input
                              type="date"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.planting_date}
                              onChange={(e) => setFormData({...formData, planting_date: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Harvest Date</label>
                            <input
                              type="date"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.expected_harvest_date}
                              onChange={(e) => setFormData({...formData, expected_harvest_date: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Expected Yield</label>
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.expected_yield}
                              onChange={(e) => setFormData({...formData, expected_yield: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Yield Unit</label>
                            <input
                              type="text"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                              value={formData.yield_unit}
                              placeholder="e.g. kg, tons"
                              onChange={(e) => setFormData({...formData, yield_unit: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notes</label>
                          <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            rows="2"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
                    onClick={closeModal}
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

export default FieldDetails;
