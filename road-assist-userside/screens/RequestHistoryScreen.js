import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RequestHistoryScreen = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load user from AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          console.log('Loaded user ID:', parsed.id);
          setUserId(parsed.id);
        } else {
          console.warn('No user found in AsyncStorage');
          Alert.alert('Error', 'User not found. Please log in again.');
        }
      } catch (err) {
        console.error('Failed to load user from storage:', err);
        Alert.alert('Error', 'Failed to load user data');
      }
    };
    loadUser();
  }, []);

  // Fetch request history when userId is available
  useEffect(() => {
    if (userId) {
      fetchRequestHistory();
    }
  }, [userId]);

  const fetchRequestHistory = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await axios.get(`http://192.168.42.159:5000/api/user/${userId}/requests`);
      setRequests(response.data || []);
    } catch (err) {
      console.error('❌ Could not load request history:', err);
      
      // Better error handling
      if (err.response) {
        // Server responded with error status
        Alert.alert('Error', `Server error: ${err.response.status}`);
      } else if (err.request) {
        // Network error
        Alert.alert('Network Error', 'Could not connect to server. Check your internet connection.');
      } else {
        // Other error
        Alert.alert('Error', 'Something went wrong while loading request history');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh functionality
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequestHistory();
    setRefreshing(false);
  };

  // Get status emoji and color
  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { emoji: '⏳', color: '#FFA500' };
      case 'accepted':
        return { emoji: '✅', color: '#4CAF50' };
      case 'completed':
        return { emoji: '🏁', color: '#2196F3' };
      case 'cancelled':
        return { emoji: '❌', color: '#F44336' };
      default:
        return { emoji: '📋', color: '#757575' };
    }
  };

  const renderItem = ({ item }) => {
    const statusDisplay = getStatusDisplay(item.status);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.issueType}>📍 {item.issue_type || 'General Request'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
            <Text style={styles.statusText}>
              {statusDisplay.emoji} {item.status || 'Unknown'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.locationText}>
          📌 Location: ({parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)})
        </Text>
        
        <Text style={styles.dateText}>
          📅 Date: {new Date(item.created_at).toLocaleString()}
        </Text>
        
        {item.provider_name && (
          <Text style={styles.providerText}>
            👨‍🔧 Provider: {item.provider_name}
          </Text>
        )}
        
        {item.notes && (
          <Text style={styles.notesText}>
            📝 Notes: {item.notes}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateTitle}>No Request History</Text>
      <Text style={styles.emptyStateText}>
        You haven't made any requests yet. When you request help, they'll appear here.
      </Text>
    </View>
  );

  // Show loading spinner while fetching data
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading request history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗂 Request History</Text>
      
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    backgroundColor: '#f8f9fa'
  },
  title: { 
    fontSize: 20, 
    marginBottom: 16, 
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  card: { 
    padding: 16, 
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  providerText: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 4,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default RequestHistoryScreen;