import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, AlertTriangle, Leaf, DollarSign, Activity } from 'lucide-react';
import api from '../../utils/api';

const NotificationCenter = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications/');
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark read", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch(`/api/notifications/read-all`);
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/api/notifications/${id}`);
            setNotifications(notifications.filter(n => n._id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const getIcon = (type, priority) => {
        if (priority === 'high') return <AlertTriangle className="w-5 h-5 text-rose-500" />;
        switch (type) {
            case 'crop_reminder': return <Leaf className="w-5 h-5 text-emerald-500" />;
            case 'finance_alert': return <DollarSign className="w-5 h-5 text-amber-500" />;
            case 'livestock_alert': return <Activity className="w-5 h-5 text-blue-500" />;
            default: return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform flex flex-col border-l border-gray-200 dark:border-gray-800">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        <Bell className="w-5 h-5 mr-2" /> Notifications
                    </h2>
                    <div className="flex gap-2">
                        {notifications.some(n => !n.is_read) && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-md dark:bg-green-900/30 dark:text-green-400"
                            >
                                Mark all read
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                            &times;
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-3">
                                <Bell className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">All caught up!</p>
                            <p className="text-xs text-gray-400 mt-1">No new notifications</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif._id} 
                                    className={`relative p-4 rounded-xl border ${notif.is_read ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/50'} transition-colors group`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            {getIcon(notif.type, notif.priority)}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`text-sm font-semibold ${notif.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <span className="text-[10px] text-gray-400 mt-2 block flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {new Date(notif.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        {!notif.is_read && (
                                            <button 
                                                onClick={() => markAsRead(notif._id)}
                                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg bg-white shadow-sm dark:bg-gray-700 dark:hover:bg-gray-600"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteNotification(notif._id)}
                                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg bg-white shadow-sm dark:bg-gray-700 dark:hover:bg-gray-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationCenter;
