import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiMapPin, 
  FiCalendar, 
  FiTag, 
  FiUser, 
  FiMail, 
  FiPhone,
  FiAlertCircle,
  FiCheckCircle,
  FiClock
} from 'react-icons/fi';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ItemStatus = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItemAndMatches();
  }, [id]);

  const fetchItemAndMatches = async () => {
    try {
      // Fetch item
      const itemDoc = await getDoc(doc(db, 'items', id));
      if (itemDoc.exists()) {
        const itemData = { id: itemDoc.id, ...itemDoc.data() };
        setItem(itemData);

        // Fetch matches if item is lost
        if (itemData.status === 'lost') {
          const matchesQuery = query(
            collection(db, 'items'),
            where('status', '==', 'found'),
            where('category', '==', itemData.category)
          );
          
          const matchesSnapshot = await getDocs(matchesQuery);
          const matchesData = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Simulate confidence score (in real app, calculate based on matching algorithm)
            confidenceScore: Math.floor(Math.random() * 40) + 60
          })).sort((a, b) => b.confidenceScore - a.confidenceScore);

          setMatches(matchesData);
        }
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'lost':
        return {
          color: 'bg-red-100 text-red-800',
          icon: FiAlertCircle,
          text: 'Lost',
          description: 'Your item has been reported as lost. We are actively searching for matches.'
        };
      case 'found':
        return {
          color: 'bg-green-100 text-green-800',
          icon: FiCheckCircle,
          text: 'Found',
          description: 'This item has been found and is waiting to be claimed.'
        };
      case 'matched':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: FiClock,
          text: 'Matched',
          description: 'We found a potential match! Please contact the finder.'
        };
      case 'returned':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: FiCheckCircle,
          text: 'Returned',
          description: 'This item has been successfully returned to its owner.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: FiClock,
          text: 'Pending',
          description: 'Item status is pending.'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Item Not Found</h1>
        <p className="text-gray-600 mb-6">The item you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(item.status);
  const StatusIcon = statusInfo.icon;

  const chartData = {
    labels: matches.slice(0, 5).map(match => `Match ${matches.indexOf(match) + 1}`),
    datasets: [
      {
        label: 'Confidence Score (%)',
        data: matches.slice(0, 5).map(match => match.confidenceScore),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top 5 Potential Matches',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Confidence Score (%)'
        }
      }
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600">{item.category}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-full font-medium ${statusInfo.color}`}>
              <StatusIcon className="inline w-4 h-4 mr-2" />
              {statusInfo.text}
            </span>
            {item.confidenceScore > 0 && (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                {item.confidenceScore}% Match
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Item Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Status Information</h2>
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${statusInfo.color.split(' ')[0]}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-700">{statusInfo.description}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Last updated: {formatDate(item.lastUpdated)}
                </p>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Item Details</h2>
            
            {item.imageUrl && (
              <div className="mb-6">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full max-w-md h-auto rounded-lg shadow-md"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                <p className="text-gray-900">{item.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <FiMapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{item.location}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FiCalendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {item.status === 'lost' ? 'Date Lost' : 'Date Found'}
                    </p>
                    <p className="font-medium">
                      {formatDate(item.status === 'lost' ? item.dateLost : item.foundDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FiTag className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{item.category}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FiUser className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Reported By</p>
                    <p className="font-medium">{item.userEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {item.pickupLocation && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Pickup Information</h3>
                <p className="text-green-700">
                  Item can be collected at: <strong>{item.pickupLocation}</strong>
                </p>
                {item.contactInfo && (
                  <p className="text-green-700 mt-1">
                    Contact: {item.contactInfo}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Matches Section (for lost items) */}
          {item.status === 'lost' && matches.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Potential Matches</h2>
              
              <div className="mb-6">
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="space-y-4">
                {matches.slice(0, 3).map((match) => (
                  <div key={match.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{match.name}</h3>
                        <p className="text-sm text-gray-600">{match.category}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {match.confidenceScore}% Match
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{match.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <FiMapPin className="w-4 h-4 mr-1" />
                          {match.location}
                        </div>
                        <div className="flex items-center">
                          <FiCalendar className="w-4 h-4 mr-1" />
                          {formatDate(match.foundDate)}
                        </div>
                      </div>
                      <Link 
                        to={`/item/${match.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {matches.length > 3 && (
                <div className="mt-4 text-center">
                  <Link to="#" className="text-primary-600 hover:text-primary-700 font-medium">
                    View all {matches.length} potential matches →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Actions and Timeline */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            
            <div className="space-y-3">
              {item.status === 'lost' && (
                <button className="w-full btn-primary">
                  Update Item Details
                </button>
              )}
              
              {item.status === 'found' && (
                <button className="w-full btn-primary">
                  Claim This Item
                </button>
              )}
              
              {item.status === 'matched' && (
                <>
                  <button className="w-full btn-primary mb-2">
                    Contact Finder
                  </button>
                  <button className="w-full btn-secondary">
                    Report as Not Mine
                  </button>
                </>
              )}
              
              <button className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition duration-200">
                Share Report
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                  <div className="w-0.5 h-full bg-gray-300"></div>
                </div>
                <div>
                  <p className="font-medium">Item Reported</p>
                  <p className="text-sm text-gray-600">{formatDate(item.createdAt)}</p>
                </div>
              </div>
              
              {item.status === 'matched' && (
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div className="w-0.5 h-full bg-gray-300"></div>
                  </div>
                  <div>
                    <p className="font-medium">Potential Match Found</p>
                    <p className="text-sm text-gray-600">Today, 10:30 AM</p>
                  </div>
                </div>
              )}
              
              <div className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium">Item Returned</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="card bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Need Help?</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <FiPhone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Contact Support</p>
                  <p className="text-sm text-blue-700">(123) 456-7890</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <FiMail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Email Support</p>
                  <p className="text-sm text-blue-700">lostfound@campus.edu</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-blue-200">
                <p className="text-sm text-blue-700">
                  If you believe this item is yours but can't claim it online, 
                  visit the campus lost & found office with your ID.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemStatus;