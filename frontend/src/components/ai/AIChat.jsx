import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Send, Trash2, Plus, MessageSquare, Loader, CloudRain, Edit2 } from 'lucide-react';
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
            <div className="mt-4 mb-2 p-4 bg-blue-50 border border-blue-100 rounded-lg dark:bg-blue-900/20 dark:border-blue-800 text-sm">
                <div className="flex items-center text-blue-800 dark:text-blue-300 font-semibold mb-2">
                    <CloudRain className="w-4 h-4 mr-2" />
                    Weather — {weather.location}
                </div>
                <div className="grid grid-cols-2 gap-4 text-blue-900 dark:text-blue-100">
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
        <div className="flex flex-col md:flex-row h-[85vh] min-h-[600px] border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden mb-8">
            {/* Sidebar */}
            <div className="w-full md:w-64 h-48 md:h-auto shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <button 
                        onClick={createConversation}
                        className="w-full flex items-center justify-center p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Chat
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
                                <div className="flex items-center overflow-hidden">
                                    <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span className="truncate text-sm font-medium" title={conv.title}>{conv.title}</span>
                                </div>
                            )}
                            
                            {!editingId && (
                                <div className="flex items-center ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                        onClick={(e) => { e.stopPropagation(); setEditTitle(conv.title); setEditingId(conv.id); }}
                                        className="text-gray-400 hover:text-blue-500 transition"
                                        title="Rename conversation"
                                        aria-label="Rename conversation"
                                   >
                                        <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button 
                                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                        className="text-gray-400 hover:text-red-500 transition"
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
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col justify-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">AgriFlow AI Assistant</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your intelligent agricultural companion</p>
                </div>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl p-4 ${
                                msg.role === 'user' 
                                    ? 'bg-green-600 text-white rounded-br-none' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                            }`}>
                                {msg.role === 'assistant' && msg.sources?.map((s, idx) => {
                                    if (s.type === 'weather') return <div key={idx}>{renderWeatherSource(s.data)}</div>;
                                    return null;
                                })}
                                <div className="prose dark:prose-invert max-w-none text-sm">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none p-4 flex items-center">
                                <Loader className="w-5 h-5 animate-spin text-green-600 mr-2" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={sendMessage} className="flex items-center gap-2">
                        <VoiceInput onTextUpdate={handleVoiceInput} onTranscription={handleVoiceInput} currentText={input} />
                        <input 
                            type="text" 
                            className="flex-1 p-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Ask AgriFlow AI..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
