import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useFocusEffect } from '@react-navigation/native';

const RequestHistoryScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchText, setSearchText] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Status options for filtering
  const statusOptions = ['all', 'open', 'assigned', 'in_progress', 'completed', 'cancelled'];

  // Animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadUserAndRequests();
  }, []);

  const loadUserAndRequests = async () => {
    try {
      // Get user data from AsyncStorage (FIXED: was using localStorage)
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        await fetchRequestHistory(parsedUser.id);
      } else {
        Alert.alert('Error', 'Please log in again');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestHistory = async (userId) => {
    try {
      const response = await axios.get(
        `http://192.168.1.113:5000/api/user/${userId}/requests`
      );
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching request history:', error);
      if (error.response?.status === 404) {
        Alert.alert('Info', 'No request history found');
        setRequests([]);
      } else {
        Alert.alert('Error', 'Failed to load request history');
      }
    }
  };

  const onRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await fetchRequestHistory(user.id);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return '#FF6B35';
      case 'assigned':
        return '#4ECDC4';
      case 'in_progress':
        return '#45B7D1';
      case 'completed':
        return '#96CEB4';
      case 'cancelled':
        return '#DD6E42';
      default:
        return '#95A5A6';
    }
  };

  const getUrgencyColor = (urgencyLevel) => {
    switch (urgencyLevel?.toLowerCase()) {
      case 'high':
        return '#E74C3C';
      case 'medium':
        return '#F39C12';
      case 'low':
        return '#27AE60';
      default:
        return '#95A5A6';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort requests
  const getFilteredRequests = useCallback(() => {
    let filtered = [...requests];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status?.toLowerCase() === filterStatus);
    }

    // Apply search filter
    if (searchText) {
      filtered = filtered.filter(req => 
        req.service_type?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.provider_name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [requests, filterStatus, searchText, sortOrder]);

  // Export request history as PDF
  const exportToPDF = async () => {
    try {
      const filteredRequests = getFilteredRequests();
      let requestsHTML = filteredRequests.map(req => `
        <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
          <h3>${req.service_type}</h3>
          <p><strong>Status:</strong> ${req.status}</p>
          <p><strong>Created:</strong> ${formatDate(req.created_at)}</p>
          <p><strong>Description:</strong> ${req.description || 'N/A'}</p>
          ${req.provider_name ? `<p><strong>Provider:</strong> ${req.provider_name}</p>` : ''}
        </div>
      `).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #2C3E50; }
              h3 { color: #2196F3; margin: 0; }
            </style>
          </head>
          <body>
            <h1>Request History</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            ${requestsHTML}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        const pdfName = `request-history-${Date.now()}.pdf`;
        const destinationPath = FileSystem.documentDirectory + pdfName;
        await FileSystem.moveAsync({ from: uri, to: destinationPath });
        await Sharing.shareAsync(destinationPath);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export request history');
    }
  };

  // Call provider
  const callProvider = (phone) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        }
        Alert.alert('Error', 'Phone calls are not supported on this device');
      })
      .catch(err => {
        console.error('Error making phone call:', err);
        Alert.alert('Error', 'Failed to make phone call');
      });
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.serviceType}>{item.service_type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Urgency:</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency_level) }]}>
            <Text style={styles.urgencyText}>{item.urgency_level?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created:</Text>
          <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
        </View>

        {item.provider_name && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Provider:</Text>
            <Text style={styles.detailValue}>{item.provider_name}</Text>
          </View>
        )}

        {item.assigned_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned:</Text>
            <Text style={styles.detailValue}>{formatDate(item.assigned_at)}</Text>
          </View>
        )}

        {item.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item.address}</Text>
          </View>
        )}
      </View>

      {item.provider_phone && (
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => {
            Alert.alert(
              'Contact Provider',
              `Call ${item.provider_name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => {
                  // In a real app, you'd use Linking.openURL(`tel:${item.provider_phone}`)
                  Alert.alert('Info', `Would call: ${item.provider_phone}`);
                }}
              ]
            );
          }}
        >
          <Text style={styles.contactButtonText}>Contact Provider</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading request history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request History</Text>
      
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#7F8C8D" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#95A5A6"
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterPicker}>
            <Picker
              selectedValue={filterStatus}
              onValueChange={setFilterStatus}
              style={{ color: '#2C3E50' }}
            >
              <Picker.Item label="All Status" value="all" />
              {statusOptions.map(status => (
                <Picker.Item
                  key={status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  value={status}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortOrder(current => current === 'newest' ? 'oldest' : 'newest')}
          >
            <MaterialIcons
              name={sortOrder === 'newest' ? 'arrow-downward' : 'arrow-upward'}
              size={24}
              color="#4ECDC4"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportToPDF}
          >
            <MaterialIcons name="file-download" size={24} color="#4ECDC4" />
          </TouchableOpacity>
        </View>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No requests found</Text>
          <Text style={styles.emptySubText}>Your emergency requests will appear here</Text>
          <TouchableOpacity 
            style={styles.newRequestButton}
            onPress={() => navigation.navigate('UserDashboard')}
          >
            <Text style={styles.newRequestButtonText}>Make New Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredRequests()}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4ECDC4']}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterPicker: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exportButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 15,
    lineHeight: 22,
  },
  requestDetails: {
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 24,
    color: '#7F8C8D',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    marginBottom: 30,
  },
  newRequestButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  newRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RequestHistoryScreen;