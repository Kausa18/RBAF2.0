import { useEffect, useCallback } from 'react';
import { getSocket } from '../config/socket';
import { Alert } from 'react-native';

export const useSocketEvents = (providerId, onNewRequest, onRequestCancelled, onRequestUpdate) => {
  const handleNewRequest = useCallback((request) => {
    if (!request) return;
    onNewRequest?.(request);
  }, [onNewRequest]);

  const handleRequestCancelled = useCallback((requestId) => {
    if (!requestId) return;
    onRequestCancelled?.(requestId);
  }, [onRequestCancelled]);

  const handleRequestUpdate = useCallback((data) => {
    if (!data) return;
    onRequestUpdate?.(data);
  }, [onRequestUpdate]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !providerId) return;

    // Join provider's room
    socket.emit('join:provider', providerId);

    // Listen for new requests
    socket.on('request:new', handleNewRequest);

    // Listen for cancelled requests
    socket.on('request:cancelled', handleRequestCancelled);

    // Listen for request updates
    socket.on('request:updated', handleRequestUpdate);

    // Listen for provider status updates
    socket.on('provider:status', (data) => {
      if (data.providerId === providerId) {
        Alert.alert('Status Update', data.message);
      }
    });

    return () => {
      socket.off('request:new', handleNewRequest);
      socket.off('request:cancelled', handleRequestCancelled);
      socket.off('request:updated', handleRequestUpdate);
      socket.off('provider:status');
      socket.emit('leave:provider', providerId);
    };
  }, [providerId, handleNewRequest, handleRequestCancelled, handleRequestUpdate]);
};