import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../../utils/api';

const CategorySuggester = ({ description, currentCategory, onSuggest }) => {
    const [suggestion, setSuggestion] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!description || description.trim().length < 5) {
            setSuggestion(null);
            return;
        }

        const timer = setTimeout(() => {
            fetchSuggestion(description);
        }, 800); // Debounce typing

        return () => clearTimeout(timer);
    }, [description]);

    const fetchSuggestion = async (text) => {
        setLoading(true);
        try {
            const res = await api.post('/ai/expense/categorize', { description: text });
            if (res.data && res.data.category && res.data.category !== currentCategory) {
                setSuggestion(res.data);
            } else {
                setSuggestion(null);
            }
        } catch (error) {
            console.error("AI Categorization failed", error);
            setSuggestion(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-2 text-xs text-gray-500 flex items-center animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                AI is thinking...
            </div>
        );
    }

    if (!suggestion || suggestion.confidence < 60) return null;

    return (
        <div className="mt-2 flex items-center text-sm animate-in fade-in zoom-in duration-300">
            <Sparkles className="h-4 w-4 text-purple-500 mr-1.5" />
            <span className="text-gray-600 dark:text-gray-400">AI Suggests:</span>
            <button
                type="button"
                onClick={() => onSuggest(suggestion.category)}
                className="ml-2 font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded transition dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            >
                {suggestion.category} ({suggestion.confidence}%)
            </button>
        </div>
    );
};

export default CategorySuggester;
