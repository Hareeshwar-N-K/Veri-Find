import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiSearch } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-9xl font-bold text-primary-600 mb-8">
          404
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link 
            to="/" 
            className="flex items-center justify-center space-x-2 btn-primary"
          >
            <FiHome className="w-5 h-5" />
            <span>Go Home</span>
          </Link>
          
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center space-x-2 btn-secondary"
          >
            <FiSearch className="w-5 h-5" />
            <span>Browse Items</span>
          </Link>
        </div>
        
        <div className="mt-12 p-6 bg-gray-50 rounded-xl">
          <h3 className="font-semibold mb-3">Looking for something specific?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Try these popular pages:
          </p>
          <div className="space-y-2">
            <Link to="/report-lost" className="block text-primary-600 hover:text-primary-700">
              Report Lost Item
            </Link>
            <Link to="/report-found" className="block text-primary-600 hover:text-primary-700">
              Report Found Item
            </Link>
            <Link to="/dashboard" className="block text-primary-600 hover:text-primary-700">
              Your Dashboard
            </Link>
            <Link to="/admin" className="block text-primary-600 hover:text-primary-700">
              Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;