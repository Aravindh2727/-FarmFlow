import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { 
  Plus, 
  Receipt, 
  Search, 
  Camera, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Filter
} from 'lucide-react';
import FinancialOverview from '../components/FinancialOverview';
import AnomalyAlert from '../components/finance/AnomalyAlert';
import CategorySuggester from '../components/finance/CategorySuggester';
import VoiceInput from '../components/finance/VoiceInput';
import ReceiptScanner from '../components/finance/ReceiptScanner';
import OCRReview from '../components/finance/OCRReview';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');

  // AI States
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [anomalySaving, setAnomalySaving] = useState(false);
  const [ocrMode, setOcrMode] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState(null);

  const initialFormState = {
    farm_id: '',
    field_id: '',
    crop_id: '',
    amount: '',
    category: 'Seeds',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Cash',
    vendor: '',
    receipt_reference: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const categories = [
    "Seeds", "Fertilizer", "Pesticide", "Labour", "Tractor", 
    "Machinery", "Irrigation", "Electricity", "Fuel", "Transport", 
    "Equipment", "Land Preparation", "Other"
  ];
  const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (selectedFarm) p.append('farm_id', selectedFarm);
      
      const [expRes, farmRes] = await Promise.all([
        api.get(`/expenses/?${p.toString()}`),
        api.get('/farms/')
      ]);
      setExpenses(expRes.data);
      setFarms(farmRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showToast("Failed to load expenses", "error");
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
    setEditingExpense(null);
    setOcrMode(false);
    setOcrReviewData(null);
    setAnomalyResult(null);
    setFormData({
      ...initialFormState,
      farm_id: selectedFarm || (farms.length > 0 ? farms[0]._id : '')
    });
    if (selectedFarm || farms.length > 0) {
      fetchFields(selectedFarm || farms[0]._id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (expense) => {
    setEditingExpense(expense);
    setOcrMode(false);
    setOcrReviewData(null);
    setAnomalyResult(null);

    const expenseDate = expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0];

    setFormData({
      farm_id: expense.farm_id || '',
      field_id: expense.field_id || '',
      crop_id: expense.crop_id || '',
      amount: expense.amount != null ? expense.amount : '',
      category: expense.category || 'Seeds',
      expense_date: expenseDate,
      description: expense.description || '',
      payment_method: expense.payment_method || 'Cash',
      vendor: expense.vendor || '',
      receipt_reference: expense.receipt_reference || ''
    });

    if (expense.farm_id) {
      await fetchFields(expense.farm_id);
    }
    if (expense.field_id) {
      await fetchCrops(expense.field_id);
    }

    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (expense) => {
    setExpenseToDelete(expense);
    setDeleteModalOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${expenseToDelete._id}`);
      showToast("Expense deleted successfully", "success");
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      showToast(error.response?.data?.detail || "Failed to delete expense", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleOcrConfirm = (extracted) => {
    let parsedDate = formData.expense_date;
    if (extracted.date) {
      const parts = extracted.date.split(/[/\-.]/);
      if (parts.length === 3) {
        let d = parts[0], m = parts[1], y = parts[2];
        if (d.length === 4) { y = parts[0]; d = parts[2]; }
        const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        if (!isNaN(Date.parse(iso))) parsedDate = iso;
      }
    }

    setFormData({
      ...formData,
      amount: parseFloat(extracted.amount) || formData.amount,
      vendor: extracted.vendor || formData.vendor,
      description: extracted.description || formData.description,
      expense_date: parsedDate
    });
    setOcrReviewData(null);
    setOcrMode(false);
  };

  const handleSubmit = async (e, forceSave = false) => {
    if (e) e.preventDefault();
    
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Please enter a valid expense amount", "error");
      return;
    }

    // AI Anomaly Check on Create only
    if (!forceSave && !editingExpense) {
      try {
        const selectedFarmObj = farms.find(f => f._id === formData.farm_id);
        const farmArea = selectedFarmObj ? parseFloat(selectedFarmObj.total_area) : 1.0;
        
        const aiRes = await api.post('/ai/expense/anomaly', {
          category: formData.category,
          amount: parsedAmount,
          farm_id: formData.farm_id,
          farm_area: farmArea
        });

        if (aiRes.data.is_anomaly) {
          setAnomalyResult(aiRes.data);
          return;
        }
      } catch (error) {
        console.error("Anomaly detection failed", error);
      }
    }

    try {
      setAnomalySaving(true);
      const payload = {
        ...formData,
        amount: parsedAmount,
        field_id: formData.field_id || null,
        crop_id: formData.crop_id || null,
        expense_date: new Date(formData.expense_date).toISOString()
      };
      
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, payload);
        showToast("Expense updated successfully", "success");
      } else {
        await api.post('/expenses/', payload);
        showToast("Expense recorded successfully", "success");
      }

      setIsModalOpen(false);
      setEditingExpense(null);
      setAnomalyResult(null);
      fetchData();
      setFormData(initialFormState);
    } catch (error) {
      console.error("Failed to save expense:", error);
      showToast(error.response?.data?.detail || "An error occurred while saving", "error");
    } finally {
      setAnomalySaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  // Filtered Expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchTerm || (
      (exp.vendor && exp.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.payment_method && exp.payment_method.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const matchesCategory = !selectedCategory || exp.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Toast Notification */}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage farm spending, purchases, and invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
          >
            <option value="">All Farms</option>
            {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
          <button 
            onClick={() => { setOcrMode(true); setIsModalOpen(true); }}
            className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer text-sm font-medium"
          >
            <Camera size={18} />
            <span>Scan Bill</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer text-sm font-medium"
          >
            <Plus size={18} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <FinancialOverview farmId={selectedFarm} />

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search vendor, category, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
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
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory('')} 
              className="text-xs text-rose-600 hover:text-rose-700 underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
            <span>Loading expenses...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded-full mb-4">
              <Receipt size={32} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {expenses.length === 0 ? 'No expenses recorded' : 'No matching expenses'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {expenses.length === 0 ? 'Keep track of your spending by recording expenses.' : 'Try changing your search or category filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Vendor</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300 font-medium whitespace-nowrap">
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {exp.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {exp.payment_method}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      - {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(exp)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleOpenDeleteModal(exp)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense"
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

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="text-rose-600 w-5 h-5" />
                <span>{ocrMode ? 'Scan Receipt' : ocrReviewData ? 'Review Data' : editingExpense ? 'Edit Expense' : 'Record Expense'}</span>
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false); 
                  setEditingExpense(null);
                  setAnomalyResult(null); 
                  setOcrMode(false); 
                  setOcrReviewData(null);
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6">
              {ocrMode && !ocrReviewData ? (
                <ReceiptScanner 
                  onScanComplete={(data) => setOcrReviewData(data)} 
                  onCancel={() => {setIsModalOpen(false); setOcrMode(false);}} 
                />
              ) : ocrReviewData ? (
                <OCRReview 
                  initialData={ocrReviewData}
                  onConfirm={handleOcrConfirm}
                  onCancel={() => {setOcrReviewData(null); setOcrMode(false);}}
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnomalyAlert 
                    result={anomalyResult} 
                    onConfirm={() => handleSubmit(null, true)}
                    onCancel={() => setAnomalyResult(null)}
                  />

                  {/* Amounts and Category */}
                  <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹) *</label>
                      <input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        required
                        className="w-full text-2xl font-bold text-rose-600 bg-transparent border-b-2 border-rose-200 dark:border-rose-800 focus:border-rose-500 outline-none pb-1"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                      <select 
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Relationships */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farm *</label>
                      <select 
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
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
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer disabled:opacity-50"
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
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer disabled:opacity-50"
                        value={formData.crop_id}
                        onChange={(e) => setFormData({...formData, crop_id: e.target.value})}
                        disabled={!formData.field_id}
                      >
                        <option value="">Select Crop</option>
                        {crops.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Extras */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                      <input 
                        type="date" 
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                      <select 
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                        value={formData.payment_method}
                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      >
                        {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label>
                      <input 
                        type="text"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        placeholder="e.g. Acme Seeds"
                        value={formData.vendor}
                        onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Ref.</label>
                      <input 
                        type="text"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        placeholder="#INV-123"
                        value={formData.receipt_reference}
                        onChange={(e) => setFormData({...formData, receipt_reference: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 text-sm h-20 resize-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="Optional details about this expense..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    ></textarea>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                      <VoiceInput 
                        currentText={formData.description}
                        onTextUpdate={(text) => setFormData({...formData, description: text})}
                      />
                      <CategorySuggester 
                        description={formData.description} 
                        currentCategory={formData.category}
                        onSuggest={(cat) => setFormData({...formData, category: cat})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingExpense(null);
                      }} 
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={anomalySaving}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {anomalySaving && <Loader2 size={16} className="animate-spin" />}
                      <span>{anomalySaving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && expenseToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Expense</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700/60 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-medium text-gray-900 dark:text-white">{expenseToDelete.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">- {formatCurrency(expenseToDelete.amount)}</span>
              </div>
              {expenseToDelete.vendor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vendor:</span>
                  <span className="text-gray-700 dark:text-gray-300">{expenseToDelete.vendor}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {expenseToDelete.expense_date ? new Date(expenseToDelete.expense_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setExpenseToDelete(null);
                }} 
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={deleting}
                onClick={handleDeleteExpense}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Delete Expense'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Expenses;
