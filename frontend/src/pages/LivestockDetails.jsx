import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { Dog, ArrowLeft, Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import RecordModal from '../components/RecordModal';
import FinancialOverview from '../components/FinancialOverview';

const LivestockDetails = () => {
  const { id } = useParams();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  const fetchAnimal = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/livestock/${id}`);
      setAnimal(response.data);
    } catch (err) {
      setError('Failed to load livestock details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRecords = useCallback(async (type) => {
    try {
      setRecordsLoading(true);
      const response = await api.get(`/livestock/${id}/${type}`);
      setRecords(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRecordsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnimal();
  }, [fetchAnimal]);

  useEffect(() => {
    if (animal && ['feed', 'medical', 'vaccinations', 'production'].includes(activeTab.toLowerCase())) {
      fetchRecords(activeTab.toLowerCase());
    }
  }, [activeTab, animal, fetchRecords]);

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`/livestock/${activeTab.toLowerCase()}/${recordId}`);
        fetchRecords(activeTab.toLowerCase());
      } catch (err) {
        alert('Failed to delete record');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 text-green-500 animate-spin" /></div>;
  }

  if (error || !animal) {
    return (
      <div className="rounded-md bg-red-50 p-4 border border-red-200">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3 text-sm text-red-700">{error || 'Livestock not found'}</div>
        </div>
      </div>
    );
  }

  const tabs = ['Overview', 'Feed', 'Medical', 'Vaccinations', 'Production', 'Financial Summary'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <Link to="/livestock" className="text-gray-500 hover:text-green-600 transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Dog className="mr-2 h-6 w-6 text-green-600" />
          {animal.animal_id} <span className="text-gray-500 text-lg ml-2 font-normal">({animal.animal_type})</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Basic Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold">{animal.status}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.gender}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Breed</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.breed || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : 'Unknown'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Purchase Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.purchase_date ? new Date(animal.purchase_date).toLocaleDateString() : 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Purchase Cost</dt>
                  <dd className="mt-1 text-sm text-gray-900">₹{(animal.purchase_cost != null ? Number(animal.purchase_cost) : 0).toFixed(2)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.source || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{animal.notes || 'None'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {['Feed', 'Medical', 'Vaccinations', 'Production'].includes(activeTab) && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">{activeTab} Records</h3>
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="-ml-1 mr-1 h-4 w-4" />
                Add {activeTab}
              </button>
            </div>

            {recordsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-green-500 animate-spin" /></div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                <p className="text-sm text-gray-500">No {activeTab.toLowerCase()} records yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      {activeTab === 'Feed' && (
                        <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th></>
                      )}
                      {activeTab === 'Medical' && (
                        <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th></>
                      )}
                      {activeTab === 'Vaccinations' && (
                        <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th></>
                      )}
                      {activeTab === 'Production' && (
                        <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th></>
                      )}
                      {activeTab !== 'Production' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((r) => {
                      const recordDate = r.feed_date || r.treatment_date || r.vaccination_date || r.production_date;
                      const formattedDate = recordDate ? new Date(recordDate).toLocaleDateString() : 'N/A';
                      const formattedNextDue = r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : 'N/A';
                      const costValue = r.cost != null ? Number(r.cost).toFixed(2) : '0.00';
                      const incomeValue = r.income != null ? Number(r.income).toFixed(2) : '0.00';

                      return (
                        <tr key={r._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formattedDate}
                          </td>
                          
                          {activeTab === 'Feed' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.feed_type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.quantity} {r.unit}</td>
                            </>
                          )}
                          {activeTab === 'Medical' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.problem}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.treatment}</td>
                            </>
                          )}
                          {activeTab === 'Vaccinations' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{r.vaccine_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formattedNextDue}</td>
                            </>
                          )}
                          {activeTab === 'Production' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.production_type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.quantity} {r.unit}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">₹{incomeValue}</td>
                            </>
                          )}
                          
                          {activeTab !== 'Production' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">₹{costValue}</td>
                          )}
                          
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} className="text-gray-600 hover:text-green-600 cursor-pointer"><Edit className="h-4 w-4 inline" /></button>
                            <button onClick={() => handleDeleteRecord(r._id)} className="text-gray-600 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4 inline" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Financial Summary' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary (Specific to {animal.animal_id})</h3>
            <FinancialOverview livestockId={id} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <RecordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchRecords(activeTab.toLowerCase());
          }}
          record={editingRecord}
          recordType={activeTab.toLowerCase()}
          livestockId={id}
          farmId={animal.farm_id}
        />
      )}
    </div>
  );
};

export default LivestockDetails;
