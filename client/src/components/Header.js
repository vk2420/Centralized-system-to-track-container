import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Settings } from 'lucide-react';

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/containers') return 'Container Management';
    if (path === '/statistics') return 'Statistics & Reports';
    if (path === '/users') return 'User Management';
    if (path.startsWith('/containers/')) {
      if (path.includes('/edit')) return 'Edit Container';
      if (path.includes('/new')) return 'New Container';
      return 'Container Details';
    }
    return 'Page Not Found';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.full_name}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <Bell className="h-5 w-5" />
          </button>
          
          {/* Settings */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <Settings className="h-5 w-5" />
          </button>
          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;