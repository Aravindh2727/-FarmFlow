import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';

const ReceiptScanner = ({ onScanComplete, onCancel }) => {
    const [status, setStatus] = useState('idle'); // idle, processing, error
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
            setErrorMsg('Unsupported file type. Please upload JPG, PNG, or WEBP.');
            setStatus('error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            setErrorMsg('File is too large. Maximum size is 10MB.');
            setStatus('error');
            return;
        }

        processImage(file);
    };

    const processImage = async (file) => {
        setStatus('processing');
        setErrorMsg('');
        setProgress(0);

        try {
            // Convert file to data URL for Tesseract
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageSrc = e.target.result;
                
                try {
                    const result = await Tesseract.recognize(
                        imageSrc,
                        'eng',
                        {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    setProgress(Math.round(m.progress * 100));
                                }
                            }
                        }
                    );

                    extractInformation(result.data.text, result.data.confidence);
                } catch (ocrErr) {
                    console.error(ocrErr);
                    setErrorMsg('Failed to read the receipt. Please try again with a clearer image.');
                    setStatus('error');
                }
            };
            reader.onerror = () => {
                setErrorMsg('Failed to read file.');
                setStatus('error');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            setErrorMsg('An unexpected error occurred while processing the image.');
            setStatus('error');
        }
    };

    const extractInformation = (rawText, confidence) => {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let extractedData = {
            vendor: '',
            date: '',
            amount: '',
            description: '',
            confidence: confidence
        };

        if (lines.length > 0) {
            // Vendor: Take the first line assuming it doesn't look like a date or amount
            const firstLine = lines[0];
            if (!firstLine.match(/\d{2}[\/\-]\d{2}/) && !firstLine.match(/(total|amount|rs|₹)/i)) {
                extractedData.vendor = firstLine;
            }

            // Iterate over lines to extract Date and Amount
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Date Extraction (DD/MM/YYYY or DD-MM-YYYY)
                const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                if (dateMatch && !extractedData.date) {
                    // Just take the raw match, we let the user review it
                    extractedData.date = dateMatch[0]; 
                }

                // Amount Extraction
                // Look for patterns like "Total", "Amount", "Rs", "₹" followed by numbers
                // or just line with just money-like format at the bottom
                const amountMatch = line.match(/(?:total|amount|rs\.?|₹|net)\s*[:\-]?\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    // Remove commas
                    extractedData.amount = amountMatch[1].replace(/,/g, '');
                }
            }

            // If no amount found via keywords, check the last few lines for standalone numbers
            if (!extractedData.amount) {
                const bottomLines = lines.slice(-5);
                for (const bl of bottomLines.reverse()) {
                    if (bl.match(/^[\d,]+\.?\d{0,2}$/) && bl.length > 1) {
                        extractedData.amount = bl.replace(/,/g, '');
                        break;
                    }
                }
            }

            // Description extraction: try to grab 1 or 2 lines in the middle
            const middleLines = lines.slice(1, -2).filter(l => 
                !l.match(/\d{2}[\/\-]\d{2}/) && // Not a date
                !l.match(/(total|amount|rs|₹)/i) && // Not a total line
                l.length > 4 // Reasonably long
            );
            
            if (middleLines.length > 0) {
                extractedData.description = middleLines[0] + (middleLines[1] ? ', ' + middleLines[1] : '');
            } else if (lines.length > 1 && !extractedData.description) {
                extractedData.description = lines[1];
            }
        }

        onScanComplete(extractedData);
    };

    if (status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scanning Receipt...</h3>
                <div className="w-full max-w-xs mt-4 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
                <p className="text-xs text-gray-400 mt-4 text-center">Powered by Tesseract.js directly in your browser.<br/>Your receipt never leaves your device.</p>
            </div>
        );
    }

    return (
        <div className="py-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2 text-green-600" />
                    Scan Bill / Receipt
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {status === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>{errorMsg}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camera Option (Mobile friendly) */}
                <button 
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <Camera className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Take Photo</span>
                    <span className="text-xs text-gray-500 mt-1">Use device camera</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        ref={cameraInputRef}
                        onChange={handleFileSelect}
                    />
                </button>

                {/* Upload Option */}
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Upload File</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP</span>
                    <input 
                        type="file" 
                        accept="image/jpeg, image/png, image/webp" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-6 bg-gray-100 dark:bg-gray-800/50 p-2 rounded-lg inline-block w-full">
                Privacy Note: OCR runs securely on your device. Images are not uploaded to our servers.
            </p>
        </div>
    );
};

export default ReceiptScanner;
