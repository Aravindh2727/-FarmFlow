import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sprout, Calendar, ListChecks, CheckCircle, Edit3 } from 'lucide-react';
import api from '../api';

const CROP_LIFECYCLE = [
  { id: 'planned', label: 'Planned' },
  { id: 'planted', label: 'Planted' },
  { id: 'growing', label: 'Growing' },
  { id: 'ready_for_harvest', label: 'Ready for Harvest' },
  { id: 'harvested', label: 'Harvested' },
  { id: 'sold', label: 'Sold' },
  { id: 'completed', label: 'Completed' }
];

const CropDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCrop();
  }, [id]);

  const fetchCrop = async () => {
    try {
      const res = await api.get(`/crops/${id}`);
      setCrop(res.data);
      setNewStatus(res.data.status);
    } catch (error) {
      console.error('Failed to fetch crop:', error);
      if (error.response && (error.response.status === 404 || error.response.status === 403)) {
        navigate('/crops');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/crops/${id}`, { status: newStatus });
      setCrop(res.data);
      setIsStatusModalOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update crop status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!crop) return null;

  const currentStatusIndex = CROP_LIFECYCLE.findIndex(s => s.id === crop.status);

  return (
    <div>
      <div className="mb-6">
        <Link to={`/fields/${crop.field_id}`} className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Field
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8 border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl leading-6 font-bold text-gray-900">{crop.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{crop.variety}</p>
          </div>
          <button 
            onClick={() => setIsStatusModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit3 className="mr-2 h-4 w-4 text-gray-500" />
            Update Status
          </button>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Sprout className="mr-2 h-4 w-4 text-gray-400" /> Area & Yield
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {crop.area} {crop.area_unit || 'acres'} 
                {crop.expected_yield && ` • Expected: ${crop.expected_yield} ${crop.yield_unit || 'units'}`}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-gray-400" /> Key Dates
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex space-x-6">
                  <div><span className="text-gray-500">Planted:</span> {crop.planting_date ? new Date(crop.planting_date).toLocaleDateString() : 'N/A'}</div>
                  <div><span className="text-gray-500">Exp. Harvest:</span> {crop.expected_harvest_date ? new Date(crop.expected_harvest_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <ListChecks className="mr-2 h-4 w-4 text-gray-400" /> Notes
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{crop.notes || 'No notes.'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Crop Lifecycle</h3>
        </div>
        <div className="p-6">
          <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
              {CROP_LIFECYCLE.map((step, stepIdx) => (
                <li key={step.id} className={`relative ${stepIdx !== CROP_LIFECYCLE.length - 1 ? 'pb-10' : ''}`}>
                  {stepIdx !== CROP_LIFECYCLE.length - 1 ? (
                    <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-green-600" aria-hidden="true"></div>
                  ) : null}
                  <div className="relative flex items-start group">
                    <span className="h-9 flex items-center">
                      {stepIdx <= currentStatusIndex ? (
                        <span className="relative z-10 w-8 h-8 flex items-center justify-center bg-green-600 rounded-full group-hover:bg-green-800">
                          <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
                        </span>
                      ) : (
                        <span className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded-full">
                          <span className="h-2.5 w-2.5 bg-transparent rounded-full" />
                        </span>
                      )}
                    </span>
                    <span className="ml-4 min-w-0 flex flex-col">
                      <span className={`text-xs font-semibold tracking-wide uppercase ${stepIdx <= currentStatusIndex ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {isStatusModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsStatusModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateStatus}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Edit3 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Update Crop Status</h3>
                      <div className="mt-4">
                        <select
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          {CROP_LIFECYCLE.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
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
                    {submitting ? 'Updating...' : 'Update Status'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
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

export default CropDetails;
