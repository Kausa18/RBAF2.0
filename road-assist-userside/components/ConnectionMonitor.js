import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { mainAPI, matcherAPI } from '../config/axios';
import { API_HOST, MATCH_HOST } from '../config/api';

const ConnectionMonitor = () => {
  const [mainStatus, setMainStatus] = useState('checking');
  const [matchStatus, setMatchStatus] = useState('checking');
  const [visible, setVisible] = useState(false);

  const checkConnection = async () => {
    setVisible(true); // Always show during testing
    
    // Check main API
    try {
      const mainRes = await mainAPI.get(`${API_HOST}/api/health`);
      console.log('Main API response:', mainRes.data);
      if (mainRes.data && mainRes.data.status === 'OK') {
        setMainStatus('connected');
      } else {
        throw new Error('Invalid health check response');
      }
    } catch (error) {
      console.log('Main API error:', error.message);
      if (error.response) {
        console.log('Response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.log('Network Error:', {
          url: `${API_HOST}/api/health`,
          code: error.code || 'UNKNOWN',
          message: error.message
        });
      }
      setMainStatus('error');
      setVisible(true);
    }

    // Check matcher
    try {
      const matchRes = await matcherAPI.get(`${MATCH_HOST}/health`);
      console.log('Matcher response:', matchRes.data);
      if (matchRes.data && matchRes.data.status === 'healthy') {
        setMatchStatus('connected');
      } else {
        throw new Error('Invalid health check response');
      }
    } catch (error) {
      console.log('Matcher error:', error.message);
      if (error.response) {
        console.log('Response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.log('Network Error:', {
          url: `${MATCH_HOST}/health`,
          code: error.code || 'UNKNOWN',
          message: error.message
        });
      }
      setMatchStatus('error');
      setVisible(true);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => setVisible(false)}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Server Status</Text>
        <Text style={styles.status}>
          Main API: {mainStatus === 'connected' ? '✅' : '❌'}
        </Text>
        <Text style={styles.status}>
          Matcher: {matchStatus === 'connected' ? '✅' : '❌'}
        </Text>
        <Text style={styles.endpoints}>
          Main: {API_HOST}{'\n'}
          Match: {MATCH_HOST}
        </Text>
        {(mainStatus === 'error' || matchStatus === 'error') && (
          <Text style={styles.help}>
            Check:{'\n'}
            • Servers running{'\n'}
            • Network connection{'\n'}
            • Device & server on same network{'\n'}
            {Platform.OS === 'android' ? 
              '• For emulator use 10.0.2.2 instead of localhost' :
              '• For iOS simulator localhost should work'}{'\n'}
            • Current IP: 172.20.10.3{'\n'}
            • Port 5000 (API) and 5001 (Matcher) open{'\n'}
            • Firewall rules allowing connections
          </Text>
        )}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={checkConnection}
        >
          <Text style={styles.refreshText}>Check Again</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 10,
    zIndex: 1000,
  },
  content: {
    padding: 10,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  status: {
    color: 'white',
    marginBottom: 3,
    fontSize: 14,
  },
  endpoints: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5,
  },
  help: {
    color: '#ffa500',
    marginTop: 5,
    fontSize: 12,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
    alignItems: 'center',
  },
  refreshText: {
    color: 'white',
    fontSize: 14,
  },
});

export default ConnectionMonitor;