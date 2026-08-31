import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const VoiceInput = ({ onTextUpdate, currentText = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const [supported, setSupported] = useState(true);
    const [language, setLanguage] = useState('en-IN');
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setSupported(false);
            return;
        }

        const recog = new SpeechRecognition();
        recog.continuous = false; // single phrase
        recog.interimResults = true;
        
        recog.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recog.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            // Only update on final transcript or show interim?
            // Let's just update the main text on final to avoid jitter, 
            // but we can append to the existing text
            if (finalTranscript) {
                const separator = currentText.length > 0 && !currentText.endsWith(' ') ? ' ' : '';
                onTextUpdate(currentText + separator + finalTranscript);
            }
        };

        recog.onerror = (event) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
                setError('Microphone permission denied.');
            } else if (event.error === 'no-speech') {
                setError('No speech detected.');
            } else {
                setError(`Voice error: ${event.error}`);
            }
        };

        recog.onend = () => {
            setIsListening(false);
        };

        setRecognition(recog);
    }, [currentText, onTextUpdate]);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
        } else {
            recognition.lang = language;
            try {
                recognition.start();
            } catch (err) {
                console.error(err);
            }
        }
    };

    if (!supported) {
        return (
            <div className="flex items-center text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                <AlertCircle className="w-4 h-4 mr-1 text-gray-400" />
                Voice input is not supported in this browser. Please type manually.
            </div>
        );
    }

    return (
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isListening}
                    className="text-xs bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-300 py-1 pl-2 pr-6 cursor-pointer outline-none"
                >
                    <option value="en-IN">English</option>
                    <option value="ta-IN">Tamil</option>
                </select>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isListening 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 animate-pulse' 
                            : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {isListening ? (
                        <>
                            <MicOff className="w-3.5 h-3.5" /> Stop Listening
                        </>
                    ) : (
                        <>
                            <Mic className="w-3.5 h-3.5" /> Start Speaking
                        </>
                    )}
                </button>
            </div>
            
            {error && (
                <span className="text-xs text-rose-500 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> {error}
                </span>
            )}
            
            {isListening && !error && (
                <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-2 animate-ping"></span>
                    Listening...
                </span>
            )}
        </div>
    );
};

export default VoiceInput;
