import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { 
  Plus, 
  Search, 
  Pickaxe, 
  Wallet, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Delete Confirmation Modal State
  const [deletingActivity, setDeletingActivity] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Notification / Toast Feedback State
  const [feedback, setFeedback] = useState(null);

  const initialFormData = {
    farm_id: '',
    field_id: '',
    crop_id: '',
    activity_type: 'Land Preparation',
    activity_date: new Date().toISOString().split('T')[0],
    description: '',
    labour_count: 0,
    labour_cost: 0,
    equipment_cost: 0,
    other_cost: 0
  };

  const [formData, setFormData] = useState(initialFormData);

  const activityTypes = [
    "Land Preparation", "Ploughing", "Sowing", "Transplanting", 
    "Fertilizing", "Spraying", "Irrigation", "Weeding", 
    "Pest Control", "Harvesting", "Transportation", "Other"
  ];

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, farmRes] = await Promise.all([
        api.get('/activities/'),
        api.get('/farms/')
      ]);
      setActivities(actRes.data || []);
      setFarms(farmRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showFeedback('error', 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchFields = async (farmId) => {
    if (!farmId) { 
      setFields([]); 
      setCrops([]); 
      return []; 
    }
    try {
      const res = await api.get(`/fields/?farm_id=${farmId}`);
      setFields(res.data || []);
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch fields:", error);
      setFields([]);
      return [];
    }
  };

  const fetchCrops = async (fieldId) => {
    if (!fieldId) { 
      setCrops([]); 
      return []; 
    }
    try {
      const res = await api.get(`/crops/?field_id=${fieldId}`);
      setCrops(res.data || []);
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch crops:", error);
      setCrops([]);
      return [];
    }
  };

  const handleOpenCreateModal = () => {
    setEditingActivity(null);
    setFormData(initialFormData);
    setFields([]);
    setCrops([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (act) => {
    setEditingActivity(act);
    
    // Format date to YYYY-MM-DD
    let formattedDate = new Date().toISOString().split('T')[0];
    if (act.activity_date) {
      formattedDate = act.activity_date.split('T')[0];
    }

    setFormData({
      farm_id: act.farm_id || '',
      field_id: act.field_id || '',
      crop_id: act.crop_id || '',
      activity_type: act.activity_type || 'Land Preparation',
      activity_date: formattedDate,
      description: act.description || '',
      labour_count: act.labour_count ?? 0,
      labour_cost: act.labour_cost ?? 0,
      equipment_cost: act.equipment_cost ?? 0,
      other_cost: act.other_cost ?? 0
    });

    // Pre-populate dependent dropdowns
    if (act.farm_id) {
      await fetchFields(act.farm_id);
    }
    if (act.field_id) {
      await fetchCrops(act.field_id);
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        farm_id: formData.farm_id,
        field_id: formData.field_id || null,
        crop_id: formData.crop_id || null,
        activity_type: formData.activity_type,
        activity_date: new Date(formData.activity_date).toISOString(),
        description: formData.description,
        labour_count: parseInt(formData.labour_count, 10) || 0,
        labour_cost: parseFloat(formData.labour_cost) || 0,
        equipment_cost: parseFloat(formData.equipment_cost) || 0,
        other_cost: parseFloat(formData.other_cost) || 0
      };
      
      const activityId = editingActivity?._id || editingActivity?.id;

      if (editingActivity && activityId) {
        await api.put(`/activities/${activityId}`, payload);
        showFeedback('success', 'Activity updated successfully!');
      } else {
        await api.post('/activities/', payload);
        showFeedback('success', 'Activity logged successfully!');
      }

      setIsModalOpen(false);
      setEditingActivity(null);
      setFormData(initialFormData);
      await fetchData();
    } catch (error) {
      console.error("Save error:", error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'An error occurred while saving.';
      showFeedback('error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (act) => {
    setDeletingActivity(act);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingActivity) return;
    const actId = deletingActivity._id || deletingActivity.id;
    setDeleteLoading(true);
    try {
      await api.delete(`/activities/${actId}`);
      showFeedback('success', 'Activity deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingActivity(null);
      await fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      const detail = error.response?.data?.detail;
      showFeedback('error', typeof detail === 'string' ? detail : 'Failed to delete activity.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const getActivityTypeBadgeClass = (type) => {
    switch (type) {
      case 'Sowing':
      case 'Transplanting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Harvesting':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Fertilizing':
      case 'Spraying':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Irrigation':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
      case 'Pest Control':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'Land Preparation':
      case 'Ploughing':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Filter activities based on search and selected filters
  const filteredActivities = activities.filter((act) => {
    const matchesSearch = searchQuery === '' || 
      (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.activity_type && act.activity_type.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFarm = !selectedFarmFilter || act.farm_id === selectedFarmFilter;
    const matchesType = !selectedTypeFilter || act.activity_type === selectedTypeFilter;

    return matchesSearch && matchesFarm && matchesType;
  });

  return (
    <>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 flex items-center p-4 mb-4 rounded-xl shadow-lg border transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button 
            onClick={() => setFeedback(null)} 
            className="ml-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activities</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track daily farm operations and labour costs</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-sm font-medium hover:shadow cursor-pointer"
        >
          <Plus size={20} />
          <span>Log Activity</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search description or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedFarmFilter}
            onChange={(e) => setSelectedFarmFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Activity Types</option>
            {activityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium">Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-full mb-4">
              <Pickaxe size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {activities.length === 0 ? 'No activities logged yet' : 'No matching activities'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-4">
              {activities.length === 0 
                ? 'Record your first farming operation and track costs seamlessly.' 
                : 'Try adjusting your filters or search terms.'}
            </p>
            {activities.length === 0 && (
              <button
                onClick={handleOpenCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Log First Activity
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Activity</th>
                  <th className="px-6 py-4 font-medium">Labour</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium text-right">Total Cost</th>
                  <th className="px-6 py-4 font-medium text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredActivities.map((act) => (
                  <tr key={act._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300 font-medium whitespace-nowrap">
                      {new Date(act.activity_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getActivityTypeBadgeClass(act.activity_type)}`}>
                        {act.activity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {act.labour_count} {act.labour_count === 1 ? 'worker' : 'workers'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={act.description || ''}>
                      {act.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(act.total_cost)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(act)}
                          title="Edit Activity"
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(act)}
                          title="Delete Activity"
                          className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log / Edit Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {editingActivity ? <Pencil className="w-5 h-5 text-blue-600" /> : <Pickaxe className="w-5 h-5 text-emerald-600" />}
                <span>{editingActivity ? 'Edit Activity' : 'Log Activity'}</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Relationships */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farm *</label>
                  <select 
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.farm_id}
                    onChange={(e) => {
                      setFormData({...formData, farm_id: e.target.value, field_id: '', crop_id: ''});
                      fetchFields(e.target.value);
                    }}
                  >
                    <option value="">Select Farm</option>
                    {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field (Optional)</label>
                  <select 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                    value={formData.field_id}
                    onChange={(e) => {
                      setFormData({...formData, field_id: e.target.value, crop_id: ''});
                      fetchCrops(e.target.value);
                    }}
                    disabled={!formData.farm_id}
                  >
                    <option value="">Select Field</option>
                    {fields.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Crop (Optional)</label>
                  <select 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                    value={formData.crop_id}
                    onChange={(e) => setFormData({...formData, crop_id: e.target.value})}
                    disabled={!formData.field_id}
                  >
                    <option value="">Select Crop</option>
                    {crops.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Activity Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Type *</label>
                  <select 
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.activity_type}
                    onChange={(e) => setFormData({...formData, activity_type: e.target.value})}
                  >
                    {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input 
                    type="date"
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.activity_date}
                    onChange={(e) => setFormData({...formData, activity_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 h-20 resize-none text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Optional details about this farm operation..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              {/* Costs */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center mb-2">
                  <Wallet size={18} className="mr-2 text-emerald-500" /> Cost Breakdown
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Labour Count (Workers)</label>
                    <input 
                      type="number" min="0"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      value={formData.labour_count}
                      onChange={(e) => setFormData({...formData, labour_count: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Labour Cost (₹)</label>
                    <input 
                      type="number" min="0" step="0.01"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      value={formData.labour_cost}
                      onChange={(e) => setFormData({...formData, labour_cost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Equipment Cost (₹)</label>
                    <input 
                      type="number" min="0" step="0.01"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      value={formData.equipment_cost}
                      onChange={(e) => setFormData({...formData, equipment_cost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Other Cost (₹)</label>
                    <input 
                      type="number" min="0" step="0.01"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      value={formData.other_cost}
                      onChange={(e) => setFormData({...formData, other_cost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Calculated Cost</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      (parseFloat(formData.labour_cost) || 0) + 
                      (parseFloat(formData.equipment_cost) || 0) + 
                      (parseFloat(formData.other_cost) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingActivity ? (submitting ? 'Updating...' : 'Update Activity') : (submitting ? 'Saving...' : 'Save Activity')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Activity</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this activity record for <span className="font-semibold text-gray-900 dark:text-white">{deletingActivity.activity_type}</span> on <span className="font-semibold text-gray-900 dark:text-white">{new Date(deletingActivity.activity_date).toLocaleDateString()}</span>?
            </p>

            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl mb-6 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between py-1">
                <span>Labour:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{deletingActivity.labour_count} workers</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Total Cost:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(deletingActivity.total_cost)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingActivity(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deleteLoading && <Loader2 size={16} className="animate-spin" />}
                <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Activities;
