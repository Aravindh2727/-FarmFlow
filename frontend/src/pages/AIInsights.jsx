import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
    Brain, 
    Sprout, 
    TrendingUp, 
    AlertTriangle,
    Loader,
    CheckCircle
} from 'lucide-react';

const AIInsights = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Yield Prediction State
    const [yieldForm, setYieldForm] = useState({
        crop_type: 'Paddy',
        season: 'Kharif',
        area: '',
        farm_id: 'default' // Would normally be fetched from user's farms
    });
    const [yieldResult, setYieldResult] = useState(null);
    const [yieldLoading, setYieldLoading] = useState(false);
    const [yieldError, setYieldError] = useState(null);

    // Profit Prediction State
    const [profitForm, setProfitForm] = useState({
        crop_type: 'Paddy',
        season: 'Kharif',
        area: '',
        farm_id: 'default'
    });
    const [profitResult, setProfitResult] = useState(null);
    const [profitLoading, setProfitLoading] = useState(false);
    const [profitError, setProfitError] = useState(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/ai/status');
            setStatus(res.data);
        } catch (error) {
            console.error("Failed to fetch AI status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleYieldPredict = async (e) => {
        e.preventDefault();
        setYieldLoading(true);
        setYieldError(null);
        setYieldResult(null);
        try {
            const res = await api.post('/ai/yield/predict', {
                ...yieldForm,
                area: parseFloat(yieldForm.area)
            });
            setYieldResult(res.data);
        } catch (err) {
            setYieldError(err.response?.data?.detail || "Prediction failed");
        } finally {
            setYieldLoading(false);
        }
    };

    const handleProfitPredict = async (e) => {
        e.preventDefault();
        setProfitLoading(true);
        setProfitError(null);
        setProfitResult(null);
        try {
            const res = await api.post('/ai/profit/predict', {
                ...profitForm,
                area: parseFloat(profitForm.area)
            });
            setProfitResult(res.data);
        } catch (err) {
            setProfitError(err.response?.data?.detail || "Prediction failed");
        } finally {
            setProfitLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader className="h-10 w-10 animate-spin text-green-600" />
            </div>
        );
    }

    if (status?.status !== 'ready') {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Models Unavailable</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">The predictive models are currently loading or unavailable.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
            <div className="mb-8">
                <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
                    <Brain className="mr-3 h-8 w-8 text-purple-600" />
                    AI Insights & Predictions
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Use machine learning to forecast your farm's performance. 
                    <span className="ml-1 inline-flex items-center text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
                        Powered by scikit-learn
                    </span>
                </p>
                <p className="mt-1 text-sm text-gray-500 italic">
                    Note: Predictions are estimates based on historical synthetic patterns. Actual results may vary.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                
                {/* YIELD PREDICTOR */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-800 dark:shadow-none">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white">
                            <Sprout className="mr-2 h-6 w-6 text-green-500" />
                            Crop Yield Forecaster
                        </h2>
                    </div>
                    
                    <form onSubmit={handleYieldPredict} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Crop Type</label>
                                <select 
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    value={yieldForm.crop_type}
                                    onChange={e => setYieldForm({...yieldForm, crop_type: e.target.value})}
                                >
                                    <option value="Paddy">Paddy</option>
                                    <option value="Wheat">Wheat</option>
                                    <option value="Corn">Corn</option>
                                    <option value="Cotton">Cotton</option>
                                    <option value="Sugarcane">Sugarcane</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Season</label>
                                <select 
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    value={yieldForm.season}
                                    onChange={e => setYieldForm({...yieldForm, season: e.target.value})}
                                >
                                    <option value="Kharif">Kharif</option>
                                    <option value="Rabi">Rabi</option>
                                    <option value="Zaid">Zaid</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Planned Area (Acres)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                required
                                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                value={yieldForm.area}
                                onChange={e => setYieldForm({...yieldForm, area: e.target.value})}
                                placeholder="e.g. 5.5"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={yieldLoading}
                            className="w-full rounded-lg bg-green-600 p-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            {yieldLoading ? 'Analyzing...' : 'Predict Yield'}
                        </button>
                    </form>

                    {yieldError && (
                        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {yieldError}
                        </div>
                    )}

                    {yieldResult && (
                        <div className="mt-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-5 border border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800">
                            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 uppercase tracking-wider">Estimated Harvest</h3>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-4xl font-extrabold text-green-600 dark:text-green-400">
                                    {yieldResult.estimated_yield_kg.toLocaleString()}
                                </span>
                                <span className="ml-2 text-lg font-medium text-green-700 dark:text-green-500">kg</span>
                            </div>
                            <div className="mt-3 flex items-center text-sm text-green-700 dark:text-green-400">
                                <CheckCircle className="mr-1.5 h-4 w-4" />
                                Model Confidence: High (R²: {status.metadata.models.yield_prediction.r2_score})
                            </div>
                        </div>
                    )}
                </div>

                {/* PROFIT PREDICTOR */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-800 dark:shadow-none">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white">
                            <TrendingUp className="mr-2 h-6 w-6 text-blue-500" />
                            Profitability Forecast
                        </h2>
                    </div>
                    
                    <form onSubmit={handleProfitPredict} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Crop Type</label>
                                <select 
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    value={profitForm.crop_type}
                                    onChange={e => setProfitForm({...profitForm, crop_type: e.target.value})}
                                >
                                    <option value="Paddy">Paddy</option>
                                    <option value="Wheat">Wheat</option>
                                    <option value="Corn">Corn</option>
                                    <option value="Cotton">Cotton</option>
                                    <option value="Sugarcane">Sugarcane</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Season</label>
                                <select 
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    value={profitForm.season}
                                    onChange={e => setProfitForm({...profitForm, season: e.target.value})}
                                >
                                    <option value="Kharif">Kharif</option>
                                    <option value="Rabi">Rabi</option>
                                    <option value="Zaid">Zaid</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Planned Area (Acres)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                required
                                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                value={profitForm.area}
                                onChange={e => setProfitForm({...profitForm, area: e.target.value})}
                                placeholder="e.g. 5.5"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={profitLoading}
                            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {profitLoading ? 'Calculating...' : 'Forecast Profit'}
                        </button>
                    </form>

                    {profitError && (
                        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {profitError}
                        </div>
                    )}

                    {profitResult && (
                        <div className="mt-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
                            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Estimated Net Profit</h3>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                                    ₹ {profitResult.estimated_profit.toLocaleString()}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center text-sm text-blue-700 dark:text-blue-400">
                                <CheckCircle className="mr-1.5 h-4 w-4" />
                                Assumes standard input costs & current market rates.
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AIInsights;
