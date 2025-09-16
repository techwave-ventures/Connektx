import { useState, useEffect } from 'react';
import { checkNetworkConnectivity } from '../api/community';

interface NetworkStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  retryCount: number;
}

export const useNetworkStatus = (checkInterval: number = 30000) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    isChecking: false,
    lastChecked: null,
    retryCount: 0
  });

  const checkConnectivity = async () => {
    setNetworkStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const isConnected = await checkNetworkConnectivity();
      setNetworkStatus(prev => ({
        isConnected,
        isChecking: false,
        lastChecked: new Date(),
        retryCount: isConnected ? 0 : prev.retryCount + 1
      }));
    } catch (error) {
      setNetworkStatus(prev => ({
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        retryCount: prev.retryCount + 1
      }));
    }
  };

  // Check connectivity on mount and set up interval
  useEffect(() => {
    checkConnectivity();
    
    const interval = setInterval(checkConnectivity, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkInterval]);

  // Retry connection manually
  const retryConnection = () => {
    if (!networkStatus.isChecking) {
      checkConnectivity();
    }
  };

  return {
    ...networkStatus,
    retryConnection,
    checkConnectivity
  };
};

export default useNetworkStatus;
