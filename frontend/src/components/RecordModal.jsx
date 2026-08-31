import React, { useState, useEffect } from 'react';
import api from '../api';
import { X, Loader2, Wheat, Activity, Syringe, Milk, AlertCircle } from 'lucide-react';

const RecordModal = ({ isOpen, onClose, onSuccess, record, recordType, livestockId, farmId }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typeConfig = {
    feed: {
      title: 'Feed Record',
      icon: Wheat,
      color: 'text-amber-500',
      initial: {
        feed_type: 'Grass',
        quantity: 1,
        unit: 'kg',
        feed_date: new Date().toISOString().split('T')[0],
        cost: 0,
        supplier: '',
        notes: ''
      }
    },
    medical: {
      title: 'Medical Record',
      icon: Activity,
      color: 'text-rose-500',
      initial: {
        treatment_date: new Date().toISOString().split('T')[0],
        problem: '',
        diagnosis: '',
        treatment: '',
        medicine: '',
        veterinarian: '',
        cost: 0,
        notes: ''
      }
    },
    vaccinations: {
      title: 'Vaccination Record',
      icon: Syringe,
      color: 'text-blue-500',
      initial: {
        vaccine_name: '',
        vaccination_date: new Date().toISOString().split('T')[0],
        next_due_date: new Date().toISOString().split('T')[0],
        administered_by: '',
        cost: 0,
        notes: ''
      }
    },
    production: {
      title: 'Production Record',
      icon: Milk,
      color: 'text-emerald-500',
      initial: {
        production_date: new Date().toISOString().split('T')[0],
        production_type: 'Milk',
        quantity: 1,
        unit: 'litre',
        quality: '',
        selling_price: 0,
        notes: ''
      }
    }
  };

  const currentConfig = typeConfig[recordType] || typeConfig.feed;
  const IconComponent = currentConfig.icon;

  useEffect(() => {
    if (record) {
      const data = { ...record };
      // Format dates for input
      ['feed_date', 'treatment_date', 'vaccination_date', 'next_due_date', 'production_date'].forEach(field => {
        if (data[field]) data[field] = data[field].split('T')[0];
      });
      setFormData(data);
    } else {
      setFormData(currentConfig.initial);
    }
    setError('');
  }, [record, recordType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, livestock_id: livestockId, farm_id: farmId };

      // Parse numbers and format dates
      ['quantity', 'cost', 'selling_price'].forEach(field => {
        if (payload[field] !== undefined && payload[field] !== '') {
          payload[field] = parseFloat(payload[field]) || 0;
        }
      });
      
      // Client-side date check for vaccinations
      if (recordType === 'vaccinations') {
        if (formData.vaccination_date && formData.next_due_date && formData.next_due_date < formData.vaccination_date) {
          setError('Next due date must be on or after vaccination date.');
          setLoading(false);
          return;
        }
      }

      ['feed_date', 'treatment_date', 'vaccination_date', 'next_due_date', 'production_date'].forEach(field => {
        if (payload[field]) {
          payload[field] = new Date(payload[field]).toISOString();
        }
      });

      if (record) {
        await api.put(`/livestock/${recordType}/${record._id}`, payload);
      } else {
        await api.post(`/livestock/${livestockId}/${recordType}`, payload);
      }
      onSuccess();
    } catch (err) {
      console.error("Save record error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : (err.message || 'An error occurred while saving.'));
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    if (recordType === 'feed') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feed Type *</label>
            <select 
              required 
              value={formData.feed_type || 'Grass'} 
              onChange={(e) => setFormData({...formData, feed_type: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="Grass">Grass</option>
              <option value="Hay">Hay</option>
              <option value="Silage">Silage</option>
              <option value="Cattle Feed">Cattle Feed</option>
              <option value="Grain">Grain</option>
              <option value="Corn">Corn</option>
              <option value="Bran">Bran</option>
              <option value="Mineral Mix">Mineral Mix</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01" 
                required 
                value={formData.quantity ?? ''} 
                onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="e.g. 5.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
              <select 
                required 
                value={formData.unit || 'kg'} 
                onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="litre">litre</option>
                <option value="packet">packet</option>
                <option value="bag">bag</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input 
                type="date" 
                required 
                value={formData.feed_date || ''} 
                onChange={(e) => setFormData({...formData, feed_date: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.cost ?? ''} 
                onChange={(e) => setFormData({...formData, cost: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier (Optional)</label>
            <input 
              type="text" 
              value={formData.supplier || ''} 
              onChange={(e) => setFormData({...formData, supplier: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              placeholder="e.g. Local Agro Store"
            />
          </div>
        </div>
      );
    } else if (recordType === 'medical') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input 
                type="date" 
                required 
                value={formData.treatment_date || ''} 
                onChange={(e) => setFormData({...formData, treatment_date: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.cost ?? ''} 
                onChange={(e) => setFormData({...formData, cost: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Problem / Symptoms *</label>
            <input 
              type="text" 
              required 
              value={formData.problem || ''} 
              onChange={(e) => setFormData({...formData, problem: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              placeholder="e.g. Mild fever and decreased appetite"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment Given *</label>
            <input 
              type="text" 
              required 
              value={formData.treatment || ''} 
              onChange={(e) => setFormData({...formData, treatment: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              placeholder="e.g. Antibiotic injection & oral rehydration"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medicine (Optional)</label>
              <input 
                type="text" 
                value={formData.medicine || ''} 
                onChange={(e) => setFormData({...formData, medicine: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="e.g. Penicillin 5ml"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Veterinarian</label>
              <input 
                type="text" 
                value={formData.veterinarian || ''} 
                onChange={(e) => setFormData({...formData, veterinarian: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="Dr. Name"
              />
            </div>
          </div>
        </div>
      );
    } else if (recordType === 'vaccinations') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vaccine Name *</label>
            <input 
              type="text" 
              required 
              value={formData.vaccine_name || ''} 
              onChange={(e) => setFormData({...formData, vaccine_name: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              placeholder="e.g. FMD / Brucellosis / Rabies"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Administered *</label>
              <input 
                type="date" 
                required 
                value={formData.vaccination_date || ''} 
                onChange={(e) => setFormData({...formData, vaccination_date: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Due Date *</label>
              <input 
                type="date" 
                required 
                value={formData.next_due_date || ''} 
                onChange={(e) => setFormData({...formData, next_due_date: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Administered By</label>
              <input 
                type="text" 
                value={formData.administered_by || ''} 
                onChange={(e) => setFormData({...formData, administered_by: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="Dr. / Officer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.cost ?? ''} 
                onChange={(e) => setFormData({...formData, cost: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      );
    } else if (recordType === 'production') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Production Type *</label>
            <input 
              type="text" 
              required 
              value={formData.production_type || ''} 
              onChange={(e) => setFormData({...formData, production_type: e.target.value})} 
              placeholder="e.g. Milk, Eggs, Wool" 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01" 
                required 
                value={formData.quantity ?? ''} 
                onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
              <input 
                type="text" 
                required 
                value={formData.unit || ''} 
                onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                placeholder="e.g. litre, dozen, kg" 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input 
                type="date" 
                required 
                value={formData.production_date || ''} 
                onChange={(e) => setFormData({...formData, production_date: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price per Unit (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.selling_price ?? ''} 
                onChange={(e) => setFormData({...formData, selling_price: e.target.value})} 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="e.g. 50"
              />
            </div>
          </div>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700 relative">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${currentConfig.color}`} />
            <span>{record ? 'Edit' : 'Add'} {currentConfig.title}</span>
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {renderFields()}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
            <textarea 
              rows={2} 
              value={formData.notes || ''} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none" 
              placeholder="Additional details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordModal;
