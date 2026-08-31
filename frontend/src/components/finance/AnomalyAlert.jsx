import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const AnomalyAlert = ({ result, onConfirm, onCancel }) => {
    if (!result) return null;
    
    // If it's not an anomaly, we don't show the alert warning, we just proceed.
    // This component is only rendered when an anomaly is actually detected.
    
    return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-900/20 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-rose-800 dark:text-rose-300">
                        Unusual Expense Detected
                    </h3>
                    <div className="mt-2 text-sm text-rose-700 dark:text-rose-400">
                        <p>{result.reason}</p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-md bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-200 focus:outline-none dark:bg-rose-800 dark:text-rose-200 dark:hover:bg-rose-700 transition"
                        >
                            Save Anyway
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                        >
                            Review Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnomalyAlert;
