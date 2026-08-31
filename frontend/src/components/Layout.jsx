import { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon, LayoutDashboard, Tractor, Menu, Bell, Sprout, Pickaxe, Receipt, Banknote, Dog, Brain, FileText } from 'lucide-react';
import NotificationCenter from './notifications/NotificationCenter';
import api from '../utils/api';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Farms', href: '/farms', icon: Tractor },
    { name: 'Crops', href: '/crops', icon: Sprout },
    { name: 'Activities', href: '/activities', icon: Pickaxe },
    { name: 'Livestock', href: '/livestock', icon: Dog },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Income', href: '/income', icon: Banknote },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'AI Insights', href: '/ai', icon: Brain },
  ];

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Poll every 60s
      return () => clearInterval(interval);
    }
  }, [user, isNotifOpen]); // Refresh count when closing modal too

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <Tractor className="h-8 w-8 text-green-600 mr-2" />
          <span className="text-2xl font-bold text-green-700">FarmFlow</span>
        </div>
        
        <div className="overflow-y-auto overflow-x-hidden flex-grow">
          <ul className="flex flex-col py-4 space-y-1">
            <li className="px-5">
              <div className="flex flex-row items-center h-8">
                <div className="text-sm font-light tracking-wide text-gray-500">Menu</div>
              </div>
            </li>
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`relative flex flex-row items-center h-11 focus:outline-none hover:bg-green-50 text-gray-600 hover:text-green-800 border-l-4 ${
                    location.pathname.startsWith(item.href) ? 'border-green-500 bg-green-50 text-green-800' : 'border-transparent'
                  } pr-6`}
                >
                  <span className="inline-flex justify-center items-center ml-4">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="ml-2 text-sm tracking-wide truncate">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 lg:flex-none"></div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 text-gray-500 hover:text-green-600 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </button>
            <div className="hidden sm:block h-6 border-l border-gray-300"></div>
            <div className="flex items-center text-gray-700">
              <UserIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <LogOut className="h-4 w-4 mr-1 sm:mr-0" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
};

export default Layout;
