import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { 
  Plus, 
  Banknote, 
  Search, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Filter 
} from 'lucide-react';
import FinancialOverview from '../components/FinancialOverview';

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const initialFormState = {
    farm_id: '',
    field_id: '',
    crop_id: '',
    source: 'Crop Sale',
    income_date: new Date().toISOString().split('T')[0],
    quantity: '',
    selling_price: '',
    amount: '',
    buyer: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const sources = ["Crop Sale", "Government Support", "Livestock Sale", "Subsidy", "Other"];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (selectedFarm) p.append('farm_id', selectedFarm);
      
      const [incRes, farmRes] = await Promise.all([
        api.get(`/income/?${p.toString()}`),
        api.get('/farms/')
      ]);
      setIncomes(incRes.data);
      setFarms(farmRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showToast("Failed to load income records", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedFarm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchFields = async (farmId) => {
    if (!farmId) { setFields([]); setCrops([]); return; }
    try {
      const res = await api.get(`/fields/?farm_id=${farmId}`);
      setFields(res.data);
    } catch (err) {
      console.error("Failed to fetch fields:", err);
      setFields([]);
    }
  };

  const fetchCrops = async (fieldId) => {
    if (!fieldId) { setCrops([]); return; }
    try {
      const res = await api.get(`/crops/?field_id=${fieldId}`);
      setCrops(res.data);
    } catch (err) {
      console.error("Failed to fetch crops:", err);
      setCrops([]);
    }
  };

  const handleOpenAddModal = () => {
    setEditingIncome(null);
    setFormData({
      ...initialFormState,
      farm_id: selectedFarm || (farms.length > 0 ? farms[0]._id : '')
    });
    if (selectedFarm || farms.length > 0) {
      fetchFields(selectedFarm || farms[0]._id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (income) => {
    setEditingIncome(income);
    const incDate = income.income_date ? income.income_date.split('T')[0] : new Date().toISOString().split('T')[0];

    setFormData({
      farm_id: income.farm_id || '',
      field_id: income.field_id || '',
      crop_id: income.crop_id || '',
      source: income.source || 'Crop Sale',
      income_date: incDate,
      quantity: income.quantity != null ? income.quantity : '',
      selling_price: income.selling_price != null ? income.selling_price : '',
      amount: income.amount != null ? income.amount : '',
      buyer: income.buyer || '',
      description: income.description || ''
    });

    if (income.farm_id) {
      await fetchFields(income.farm_id);
    }
    if (income.field_id) {
      await fetchCrops(income.field_id);
    }

    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (income) => {
    setIncomeToDelete(income);
    setDeleteModalOpen(true);
  };

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/income/${incomeToDelete._id}`);
      showToast("Income deleted successfully", "success");
      setDeleteModalOpen(false);
      setIncomeToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete income:", error);
      showToast(error.response?.data?.detail || "Failed to delete income", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Calculate dynamic amount based on qty and price
  const calculateAmount = () => {
    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.selling_price);
    if (!isNaN(qty) && !isNaN(price)) {
      return (qty * price).toFixed(2);
    }
    return formData.amount || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAmount = parseFloat(calculateAmount()) || parseFloat(formData.amount) || 0;

      const payload = {
        ...formData,
        field_id: formData.field_id || null,
        crop_id: formData.crop_id || null,
        quantity: formData.quantity !== '' ? parseFloat(formData.quantity) : null,
        selling_price: formData.selling_price !== '' ? parseFloat(formData.selling_price) : null,
        amount: finalAmount,
        income_date: new Date(formData.income_date).toISOString()
      };
      
      if (editingIncome) {
        await api.put(`/income/${editingIncome._id}`, payload);
        showToast("Income record updated successfully", "success");
      } else {
        await api.post('/income/', payload);
        showToast("Income recorded successfully", "success");
      }

      setIsModalOpen(false);
      setEditingIncome(null);
      fetchData();
      setFormData(initialFormState);
    } catch (error) {
      console.error("Failed to save income:", error);
      showToast(error.response?.data?.detail || "An error occurred while saving", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  // Filtered Incomes
  const filteredIncomes = incomes.filter(inc => {
    const matchesSearch = !searchTerm || (
      (inc.buyer && inc.buyer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inc.source && inc.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inc.description && inc.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const matchesSource = !selectedSource || inc.source === selectedSource;

    return matchesSearch && matchesSource;
  });

  return (
    <>
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200' 
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track crop sales, livestock yield, and revenue streams</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
          >
            <option value="">All Farms</option>
            {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
          <button 
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer text-sm font-medium"
          >
            <Plus size={18} />
            <span>Record Income</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <FinancialOverview farmId={selectedFarm} />

      {/* Search & Source Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search buyer, source, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          <select 
            value={selectedSource} 
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {selectedSource && (
            <button 
              onClick={() => setSelectedSource('')} 
              className="text-xs text-emerald-600 hover:text-emerald-700 underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
            <span>Loading income...</span>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-full mb-4">
              <Banknote size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {incomes.length === 0 ? 'No income recorded' : 'No matching income'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {incomes.length === 0 ? 'Record your sales to track your farm\'s revenue.' : 'Try changing your search or source filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Source</th>
                  <th className="px-6 py-4 font-medium">Buyer</th>
                  <th className="px-6 py-4 font-medium">Qty / Price</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredIncomes.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300 font-medium whitespace-nowrap">
                      {inc.income_date ? new Date(inc.income_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {inc.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {inc.buyer || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {inc.quantity ? `${inc.quantity} × ₹${inc.selling_price}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      + {formatCurrency(inc.amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(inc)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Income"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleOpenDeleteModal(inc)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Income"
                        >
                          <Trash2 size={16} />
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

      {/* Record / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Banknote className="text-emerald-600 w-5 h-5" />
                <span>{editingIncome ? 'Edit Income' : 'Record Income'}</span>
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false); 
                  setEditingIncome(null);
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Amounts and Source */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source *</label>
                  <select 
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                  >
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount (₹) *</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    required
                    className="w-full text-2xl font-bold text-emerald-600 bg-transparent border-b-2 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 outline-none pb-1"
                    placeholder="0.00"
                    value={calculateAmount()}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    readOnly={Boolean(formData.quantity && formData.selling_price)}
                  />
                  {(formData.quantity && formData.selling_price) && (
                    <span className="text-xs text-emerald-600/80 mt-1 block">Calculated from Qty & Price</span>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farm *</label>
                  <select 
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
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
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-50"
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
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                    value={formData.crop_id}
                    onChange={(e) => setFormData({...formData, crop_id: e.target.value})}
                    disabled={!formData.field_id}
                  >
                    <option value="">Select Crop</option>
                    {crops.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity (Optional)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price / Unit (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. 40"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.income_date}
                    onChange={(e) => setFormData({...formData, income_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer / Payee</label>
                <input 
                  type="text"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. Local Mandi / Dealer"
                  value={formData.buyer}
                  onChange={(e) => setFormData({...formData, buyer: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm h-20 resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Optional details about this income transaction..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingIncome(null);
                  }} 
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  <span>{saving ? 'Saving...' : editingIncome ? 'Update Income' : 'Save Income'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && incomeToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Income</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700/60 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Source:</span>
                <span className="font-medium text-gray-900 dark:text-white">{incomeToDelete.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+ {formatCurrency(incomeToDelete.amount)}</span>
              </div>
              {incomeToDelete.buyer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Buyer:</span>
                  <span className="text-gray-700 dark:text-gray-300">{incomeToDelete.buyer}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {incomeToDelete.income_date ? new Date(incomeToDelete.income_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setIncomeToDelete(null);
                }} 
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={deleting}
                onClick={handleDeleteIncome}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Delete Income'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Income;
