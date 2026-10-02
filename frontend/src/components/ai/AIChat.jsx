import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Send, Trash2, Plus, MessageSquare, Loader, CloudRain, Edit2, Menu, X } from 'lucide-react';
import VoiceInput from '../finance/VoiceInput';
import ReactMarkdown from 'react-markdown';

const generateConversationTitle = (message) => {
    let text = message.trim().replace(/\s+/g, ' ');
    const lower = text.toLowerCase();
    
    if (lower.includes("profit") || lower.includes("spend") || lower.includes("cost") || lower.includes("earn")) {
        if (lower.includes("profit")) return "Farm Profit";
        if (lower.includes("spend") || lower.includes("cost")) return "Monthly Spending";
    }
    if (lower.includes("farm") && lower.includes("have")) return "What Farms Do I Have?";
    if (lower.includes("weather") && lower.includes("crop")) return "Weather Impact on Crops";
    if (lower.includes("crop") && lower.includes("have")) return "My Crops";
    if (lower.includes("vaccination")) return "Next Vaccination";
    if (lower.includes("crop rotation")) return "Crop Rotation";
    if (text.includes("என்னிடம் எத்தனை பண்ணைகள் உள்ளன")) return "என் பண்ணைகள்";
    
    let title = text.split(/[.?!]/)[0].trim();
    if (title.length > 35) {
        title = title.substring(0, 32) + "...";
    }
    if (/^[A-Za-z\s.,?!]+$/.test(title)) {
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return title || "New Conversation";
};

const AIChat = () => {
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (activeConversationId) {
            fetchMessages(activeConversationId);
        } else {
            setMessages([]);
        }
    }, [activeConversationId]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/ai/conversations');
            setConversations(res.data);
            if (res.data.length > 0 && !activeConversationId) {
                setActiveConversationId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        }
    };

    const fetchMessages = async (id) => {
        try {
            const res = await api.get(`/ai/conversations/${id}`);
            setMessages(res.data);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    const createConversation = async () => {
        try {
            const res = await api.post('/ai/conversations');
            setConversations([res.data, ...conversations]);
            setActiveConversationId(res.data.id);
        } catch (error) {
            console.error("Failed to create conversation", error);
        }
    };

    const deleteConversation = async (id) => {
        try {
            await api.delete(`/ai/conversations/${id}`);
            setConversations(conversations.filter(c => c.id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to delete conversation", error);
        }
    };

    const handleRenameSubmit = async (id, e) => {
        if (e) e.preventDefault();
        const newTitle = editTitle.trim();
        if (!newTitle) {
            setEditingId(null);
            return;
        }
        
        const currentConv = conversations.find(c => c.id === id);
        if (currentConv && currentConv.title === newTitle) {
            setEditingId(null);
            return;
        }

        const originalTitle = currentConv ? currentConv.title : "New Conversation";
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle, title_source: "manual" } : c));
        setEditingId(null);

        try {
            await api.patch(`/ai/conversations/${id}`, { title: newTitle, source: "manual" });
        } catch (error) {
            console.error("Failed to rename conversation", error);
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: originalTitle } : c));
        }
    };

    const sendMessage = async (e = null, customMessage = null) => {
        if (e) e.preventDefault();
        const msgText = customMessage || input;
        if (!msgText.trim()) return;

        const isFirstMessage = messages.length === 0;

        const newMsg = { id: Date.now().toString(), role: 'user', content: msgText };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setLoading(true);

        try {
            const payload = { message: msgText };
            if (activeConversationId) {
                payload.conversation_id = activeConversationId;
            }

            const res = await api.post('/ai/chat', payload);
            
            if (!activeConversationId && res.data.conversation_id) {
                const newTitle = generateConversationTitle(msgText);
                await api.patch(`/ai/conversations/${res.data.conversation_id}`, { title: newTitle, source: "auto" }).catch(() => {});
                setActiveConversationId(res.data.conversation_id);
                fetchConversations();
            } else if (activeConversationId && isFirstMessage) {
                const currentConv = conversations.find(c => c.id === activeConversationId);
                if (currentConv && (!currentConv.title || currentConv.title === "New Conversation" || currentConv.title_source === "default")) {
                     const newTitle = generateConversationTitle(msgText);
                     await api.patch(`/ai/conversations/${activeConversationId}`, { title: newTitle, source: "auto" }).catch(() => {});
                     setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: newTitle, title_source: "auto" } : c));
                }
            }

            const aiMsg = { 
                id: Date.now().toString() + "1", 
                role: 'assistant', 
                content: res.data.answer,
                sources: res.data.sources
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg = { 
                id: Date.now().toString() + "2", 
                role: 'assistant', 
                content: error.response?.data?.detail || error.response?.data?.answer || "Sorry, I am currently unable to process your request." 
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        sendMessage(null, suggestion);
    };

    const suggestions = [
        "What farms do I have?",
        "Which crop is most profitable?",
        "How much did I spend this month?",
        "What is the weather today?",
        "When is the next vaccination?"
    ];

    const handleVoiceInput = (text) => {
        setInput(text);
    };

    const renderWeatherSource = (weather) => {
        if (!weather || !weather.current) return null;
        return (
            <div className="mt-4 mb-2 p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-lg dark:bg-blue-900/20 dark:border-blue-800 text-sm w-full">
                <div className="flex items-center text-blue-800 dark:text-blue-300 font-semibold mb-2">
                    <CloudRain className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Weather — {weather.location}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-blue-900 dark:text-blue-100">
                    <div>
                        <span className="opacity-75">Temperature:</span> {weather.current.temperature_2m}°C
                    </div>
                    <div>
                        <span className="opacity-75">Humidity:</span> {weather.current.relative_humidity_2m}%
                    </div>
                    <div>
                        <span className="opacity-75">Precipitation:</span> {weather.current.precipitation} mm
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-row h-[calc(100dvh-180px)] sm:h-[85vh] min-h-[500px] sm:min-h-[600px] w-full border-y sm:border border-gray-200 dark:border-gray-700 sm:rounded-2xl bg-white dark:bg-gray-800 sm:shadow-xl overflow-hidden sm:mb-8 relative">
            {/* Sidebar */}
            <div className={`${isHistoryOpen ? 'flex' : 'hidden'} md:flex absolute md:relative z-30 w-full md:w-64 h-full md:h-auto shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md md:backdrop-blur-none flex-col top-0 left-0`}>
                <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button 
                        onClick={() => { createConversation(); setIsHistoryOpen(false); }}
                        className="w-fit md:w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full md:rounded-lg transition mx-auto md:mx-0"
                    >
                        <Plus className="w-4 h-4 mr-2 shrink-0" /> New Chat
                    </button>
                    <button onClick={() => setIsHistoryOpen(false)} className="md:hidden p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {conversations.map(conv => (
                        <div 
                            key={conv.id}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 transition ${
                                activeConversationId === conv.id 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => setActiveConversationId(conv.id)}
                        >
                            {editingId === conv.id ? (
                                <div className="flex-1 flex items-center bg-white dark:bg-gray-800 rounded px-2 py-1 mr-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="text" 
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRenameSubmit(conv.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        autoFocus
                                        className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200"
                                        onBlur={() => handleRenameSubmit(conv.id)}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center overflow-hidden flex-1 min-w-0">
                                    <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
                                    <span className="truncate text-sm font-medium" title={conv.title}>{conv.title}</span>
                                </div>
                            )}
                            
                            {!editingId && (
                                <div className="flex items-center shrink-0 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button 
                                        onClick={(e) => { e.stopPropagation(); setEditTitle(conv.title); setEditingId(conv.id); }}
                                        className="p-2 text-gray-400 hover:text-blue-500 transition"
                                        title="Rename conversation"
                                        aria-label="Rename conversation"
                                   >
                                        <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button 
                                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                        title="Delete conversation"
                                        aria-label="Delete conversation"
                                   >
                                        <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 relative">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm sticky top-0 z-10">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white leading-tight">AgriFlow AI Assistant</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your intelligent agricultural companion</p>
                    </div>
                    <button onClick={() => setIsHistoryOpen(true)} className="md:hidden p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition">
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-3xl mx-auto flex flex-col">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">🧠</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Hello! How can I help?</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                                I can answer questions about your farm, crops, livestock, finances, weather, and AI predictions.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestions.map((sug, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleSuggestionClick(sug)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-full transition"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={msg.id || i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-1 mr-3 shadow-sm">
                                    <span className="text-sm">🧠</span>
                                </div>
                            )}
                            <div className={`max-w-[85%] sm:max-w-[80%] break-words overflow-hidden ${
                                msg.role === 'user' 
                                    ? 'bg-green-600 text-white rounded-2xl rounded-br-none p-3 sm:p-4 shadow-sm' 
                                    : 'text-gray-800 dark:text-gray-100 pt-1'
                            }`}>
                                {msg.role === 'assistant' && msg.sources?.map((s, idx) => {
                                    if (s.type === 'weather') return <div key={idx} className="w-full overflow-x-auto">{renderWeatherSource(s.data)}</div>;
                                    return null;
                                })}
                                <div className="prose dark:prose-invert max-w-none text-sm sm:text-base break-words overflow-x-auto">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex w-full justify-start mb-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-1 mr-3 shadow-sm">
                                <span className="text-sm">🧠</span>
                            </div>
                            <div className="text-gray-800 dark:text-gray-100 pt-1 flex items-center">
                                <Loader className="w-5 h-5 animate-spin text-green-600 mr-2" />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div 
                    className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 w-full sticky bottom-0 z-10"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
                >
                    <form onSubmit={sendMessage} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-3xl mx-auto w-full">
                        <div className="w-full sm:w-auto shrink-0">
                            <VoiceInput onTextUpdate={handleVoiceInput} onTranscription={handleVoiceInput} currentText={input} />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                            <input 
                                type="text" 
                                className="flex-1 min-w-0 p-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="Ask AgriFlow AI..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="shrink-0 p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
