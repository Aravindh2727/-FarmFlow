import React, { useState } from 'react';
import { FileText, Calendar, DollarSign, Tag, Check, AlertTriangle } from 'lucide-react';

const OCRReview = ({ initialData, onConfirm, onCancel }) => {
    const [data, setData] = useState({
        vendor: initialData?.vendor || '',
        date: initialData?.date || '',
        amount: initialData?.amount || '',
        description: initialData?.description || ''
    });

    const confidence = initialData?.confidence || 0;
    const isLowConfidence = confidence < 65 && confidence > 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(data);
    };

    return (
        <div className="py-2">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Review Extracted Data</h3>
                <p className="text-sm text-gray-500">
                    We've scanned your bill. Please verify the extracted information below before continuing.
                </p>
                {isLowConfidence && (
                    <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-3 flex items-start text-yellow-800 dark:text-yellow-400 text-sm">
                        <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>The scan quality was low. Please carefully check the amount and date.</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={data.vendor}
                            onChange={(e) => setData({ ...data, vendor: e.target.value })}
                            className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 focus:border-green-500 focus:ring-green-500"
                            placeholder="e.g. ABC Agro"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={data.amount}
                                onChange={(e) => setData({ ...data, amount: e.target.value })}
                                className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 focus:border-green-500 focus:ring-green-500 font-semibold"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={data.date}
                                onChange={(e) => setData({ ...data, date: e.target.value })}
                                className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 focus:border-green-500 focus:ring-green-500"
                                placeholder="DD/MM/YYYY"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 pl-1">Will format automatically</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description snippet</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                            <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData({ ...data, description: e.target.value })}
                            className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 h-20 focus:border-green-500 focus:ring-green-500"
                            placeholder="Information from bill body..."
                        ></textarea>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex justify-center items-center"
                    >
                        <Check className="w-5 h-5 mr-1" /> Use Data
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OCRReview;
