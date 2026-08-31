import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Loader2, 
  Eye, 
  ExternalLink, 
  Printer, 
  X, 
  Maximize2,
  BarChart3
} from 'lucide-react';
import api from '../utils/api';

const Reports = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [reportType, setReportType] = useState('financial'); // 'financial', 'farm'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  // PDF Preview states
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'pdf'

  const fetchFarms = useCallback(async () => {
    try {
      const res = await api.get('/farms/');
      setFarms(res.data);
    } catch (error) {
      console.error("Failed to fetch farms", error);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  // Clean up object URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const getReportPdfUrl = () => {
    let url = '';
    if (reportType === 'financial') {
      url = `/reports/financial/pdf?`;
      if (selectedFarm) url += `farm_id=${selectedFarm}&`;
      if (startDate) url += `start_date=${new Date(startDate).toISOString()}&`;
      if (endDate) url += `end_date=${new Date(endDate).toISOString()}`;
    } else if (reportType === 'farm') {
      if (!selectedFarm) return null;
      url = `/reports/farm/${selectedFarm}/pdf`;
    }
    return url;
  };

  const handlePreview = async () => {
    setLoading(true);
    setPreview(null);
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    try {
      let url = '';
      if (reportType === 'financial') {
        url = `/reports/financial/preview?`;
        if (selectedFarm) url += `farm_id=${selectedFarm}&`;
        if (startDate) url += `start_date=${new Date(startDate).toISOString()}&`;
        if (endDate) url += `end_date=${new Date(endDate).toISOString()}`;
      } else if (reportType === 'farm') {
        if (!selectedFarm) {
          alert("Please select a farm first.");
          setLoading(false);
          return;
        }
        url = `/reports/farm/${selectedFarm}/preview`;
      }
      
      const res = await api.get(url);
      setPreview(res.data);
      setActiveTab('summary');
    } catch (error) {
      console.error("Failed to fetch preview", error);
      alert(error.response?.data?.detail || "Failed to generate report preview.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch and prepare PDF for preview (modal or inline tab)
  const loadPdfPreview = async (openModal = false) => {
    const url = getReportPdfUrl();
    if (!url) {
      alert("Please select a farm first.");
      return;
    }

    setPdfLoading(true);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }

      const newUrl = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(newUrl);

      if (openModal) {
        setPdfModalOpen(true);
      } else {
        setActiveTab('pdf');
      }
    } catch (error) {
      console.error("Failed to generate PDF preview", error);
      alert("Failed to load PDF preview. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = async (format) => {
    let url = '';
    if (reportType === 'financial') {
      url = `/reports/financial/${format}?`;
      if (selectedFarm) url += `farm_id=${selectedFarm}&`;
      if (startDate) url += `start_date=${new Date(startDate).toISOString()}&`;
      if (endDate) url += `end_date=${new Date(endDate).toISOString()}`;
    } else if (reportType === 'farm') {
      if (!selectedFarm) {
        alert("Please select a farm first.");
        return;
      }
      url = `/reports/farm/${selectedFarm}/${format}`;
    }

    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${reportType}_report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(`Failed to download ${format}`, error);
      alert(`Failed to download ${format.toUpperCase()}`);
    }
  };

  const handlePrintPdf = () => {
    if (!pdfPreviewUrl) return;
    const printWindow = window.open(pdfPreviewUrl);
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Export</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Generate, preview, and download farm analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white">
            <Filter className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">Report Settings</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
              <select 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setPreview(null);
                  if (pdfPreviewUrl) {
                    window.URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }
                }}
              >
                <option value="financial">Financial Report</option>
                <option value="farm">Farm Summary Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Farm {reportType === 'farm' && <span className="text-rose-500">*</span>}
              </label>
              <select 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
              >
                <option value="">All Farms (Combined)</option>
                {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>

            {reportType === 'financial' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input 
                    type="date"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input 
                    type="date"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button 
              onClick={handlePreview}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span>{loading ? 'Generating Preview...' : 'Generate Preview'}</span>
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Report Preview</span>
            </h2>

            {/* View Switcher Tabs (Summary vs Live PDF) */}
            {preview && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={14} />
                  <span>Data Summary</span>
                </button>
                <button
                  onClick={() => {
                    if (!pdfPreviewUrl) {
                      loadPdfPreview(false);
                    } else {
                      setActiveTab('pdf');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Eye size={14} />
                  <span>Live PDF</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                <Loader2 className="w-9 h-9 animate-spin mb-3 text-emerald-600" />
                <p className="text-sm font-medium">Analyzing data & generating preview...</p>
              </div>
            ) : preview ? (
              <div className="flex-1 flex flex-col">
                {activeTab === 'summary' ? (
                  /* Data Summary View */
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 flex-1 flex flex-col justify-center">
                    {reportType === 'financial' ? (
                      <div className="w-full max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center border-b pb-4 dark:border-gray-700">
                          Financial Summary
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Income:</span>
                            <span className="font-bold text-lg text-emerald-600">₹{preview.total_income?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Expenses:</span>
                            <span className="font-bold text-lg text-rose-600">₹{preview.total_expenses?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xs border-2 border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-gray-900 dark:text-white font-semibold text-sm">Net Profit:</span>
                            <span className={`font-bold text-lg ${preview.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ₹{preview.net_profit?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-lg mx-auto">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center border-b pb-4 dark:border-gray-700">
                          {preview.farm_name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center shadow-xs border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 font-medium">Total Area</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{preview.total_area}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center shadow-xs border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 font-medium">Fields</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{preview.field_count}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center shadow-xs border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 font-medium">Active Crops</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{preview.active_crops}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center shadow-xs border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 font-medium">Livestock</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{preview.active_livestock}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Embedded Live PDF View */
                  <div className="relative flex-1 min-h-[420px] bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {pdfLoading ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
                        <p className="text-sm font-medium">Rendering PDF Document...</p>
                      </div>
                    ) : pdfPreviewUrl ? (
                      <div className="h-full flex flex-col">
                        <div className="bg-gray-200 dark:bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-700">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Live PDF Preview</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPdfModalOpen(true)}
                              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-300/60 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                              title="Full Screen Preview"
                            >
                              <Maximize2 size={15} />
                            </button>
                            <button
                              onClick={handlePrintPdf}
                              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-300/60 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                              title="Print PDF"
                            >
                              <Printer size={15} />
                            </button>
                          </div>
                        </div>
                        <iframe 
                          src={`${pdfPreviewUrl}#toolbar=1`}
                          title="PDF Preview Document"
                          className="w-full flex-1 min-h-[380px] border-0"
                        />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                        <p className="text-sm">Click "Preview PDF" to load the document.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px] py-16">
                <FileText className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">Select your filters and click Generate Preview</p>
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          {preview && (
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              {/* PDF Preview Button */}
              <button 
                onClick={() => loadPdfPreview(true)}
                disabled={pdfLoading}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 py-3 px-4 rounded-xl font-medium text-sm transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-xs"
              >
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                <span>Preview PDF</span>
              </button>

              {/* Download PDF Button */}
              <button 
                onClick={() => handleDownload('pdf')}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white dark:bg-gray-700 dark:hover:bg-gray-600 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              {/* Export CSV Button (Financial Only) */}
              {reportType === 'financial' && (
                <button 
                  onClick={() => handleDownload('csv')}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-Featured PDF Preview Modal */}
      {pdfModalOpen && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {reportType === 'financial' ? 'Financial Report PDF' : `${preview?.farm_name || 'Farm'} Summary Report PDF`}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Live generated PDF document</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintPdf}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
                  title="Print Report"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <a 
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
                  title="Open in new window"
                >
                  <ExternalLink size={15} />
                  <span className="hidden sm:inline">Open in Tab</span>
                </a>
                <button 
                  onClick={() => handleDownload('pdf')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                  title="Download PDF"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button 
                  onClick={() => setPdfModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Embedded PDF Viewer */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-950 p-4">
              <iframe 
                src={`${pdfPreviewUrl}#toolbar=1`}
                title="Full PDF Preview"
                className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;
