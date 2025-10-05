import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  Switch,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderDashboardScreen = () => {
  const [requests, setRequests] = useState([]);
  const [providerLocation, setProviderLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [statistics, setStatistics] = useState({
    totalCompleted: 0,
    rating: 0,
    todayEarnings: 0
  });
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);
  
  const navigation = useNavigation();

  // Load provider data from AsyncStorage
  useEffect(() => {
    const loadProvider = async () => {
      try {
        const providerData = await AsyncStorage.getItem('provider');
        if (providerData) {
          setProvider(JSON.parse(providerData));
        } else {
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error loading provider data:', error);
        Alert.alert('Error', 'Failed to load provider data');
      }
    };
    loadProvider();
  }, []);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // Fetch open requests and provider statistics
  useEffect(() => {
    if (!provider) return;

    setLoading(true);
    Promise.all([
      axios.get('http://172.20.10.3:5000/api/open-requests'),
      axios.get(`http://172.20.10.3:5000/api/provider/${provider.id}/statistics`)
    ])
      .then(([requestsRes, statsRes]) => {
        setRequests(requestsRes.data);
        setStatistics(statsRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching data:', err);
        Alert.alert('Error', 'Could not fetch dashboard data');
        setLoading(false);
      });
  }, [provider]);

  // Track provider's location and update availability
  useFocusEffect(
    useCallback(() => {
      if (!provider) return;

      const updateLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location permission is required');
            return;
          }

          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });

          setProviderLocation(loc.coords);
          await axios.put(`http://172.20.10.3:5000/api/update-location/${provider.id}`, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            is_available: isAvailable
          });
        } catch (err) {
          console.log('📍 Location error:', err);
        }
      };

      updateLocation();
      const interval = setInterval(updateLocation, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }, [provider, isAvailable])
  );

  // Toggle availability status
  const toggleAvailability = async () => {
    try {
      await axios.put(`http://172.20.10.3:5000/api/provider/${provider.id}/availability`, {
        is_available: !isAvailable
      });
      setIsAvailable(!isAvailable);
      Alert.alert(
        'Status Updated',
        `You are now ${!isAvailable ? 'available' : 'unavailable'} for new requests`
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  // View request details
  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  // Accept a help request
  const acceptRequest = async (request) => {
    if (!isAvailable) {
      Alert.alert('Not Available', 'Please set your status to available first');
      return;
    }

    try {
      await axios.put(`http://172.20.10.3:5000/api/assign-request/${request.id}`, {
        provider_id: provider.id
      });
      
      setActiveRequest(request);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setModalVisible(false);
      
      Alert.alert(
        '✅ Request Accepted',
        'Navigate to customer location?',
        [
          {
            text: 'Yes',
            onPress: () => openMapsApp(request.latitude, request.longitude)
          },
          { text: 'Later' }
        ]
      );
    } catch (err) {
      console.error('❌ Accept error:', err);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  // Open maps application for navigation
  const openMapsApp = (lat, lng) => {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${latLng}`,
      android: `${scheme}${latLng}`
    });

    Linking.openURL(url);
  };

  // Update request status
  const updateRequestStatus = async (requestId, status) => {
    try {
      await axios.put(`http://172.20.10.3:5000/api/request/${requestId}/status`, { status });
      
      if (status === 'completed') {
        setActiveRequest(null);
        Alert.alert('Success', 'Request completed successfully!');
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('provider');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout properly');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.heading}>🔧 Provider Dashboard</Text>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isAvailable ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>
        <Text style={styles.statusText}>
          Status: {isAvailable ? '🟢 Available' : '🔴 Unavailable'}
        </Text>
      </View>

      {/* Statistics Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.totalCompleted}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.rating.toFixed(1)}⭐</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${statistics.todayEarnings}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Active Request Section */}
      {activeRequest && (
        <View style={styles.activeRequestCard}>
          <Text style={styles.activeRequestTitle}>🚗 Active Request</Text>
          <Text><Text style={styles.label}>Customer:</Text> {activeRequest.user_name}</Text>
          <Text><Text style={styles.label}>Issue:</Text> {activeRequest.service_type}</Text>
          <Button 
            title="Complete Request"
            onPress={() => updateRequestStatus(activeRequest.id, 'completed')}
            color="#4CAF50"
          />
        </View>
      )}

      {/* Map View */}
      {providerLocation && (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={{
            latitude: providerLocation.latitude,
            longitude: providerLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02
          }}
        >
          <Marker
            coordinate={providerLocation}
            title="Your Location"
            pinColor="blue"
          />
          <Circle
            center={providerLocation}
            radius={2000}
            fillColor="rgba(0, 0, 255, 0.1)"
            strokeColor="rgba(0, 0, 255, 0.3)"
          />
          {requests.map((req) => (
            <Marker
              key={req.id}
              coordinate={{
                latitude: parseFloat(req.latitude),
                longitude: parseFloat(req.longitude)
              }}
              title={`${req.service_type} Request`}
              description={`${calculateDistance(
                providerLocation.latitude,
                providerLocation.longitude,
                parseFloat(req.latitude),
                parseFloat(req.longitude)
              )} km away`}
              onPress={() => viewRequestDetails(req)}
            />
          ))}
        </MapView>
      )}

      {/* Request List */}
      <ScrollView style={styles.requestList}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : requests.length === 0 ? (
          <Text style={styles.noRequests}>No open requests found</Text>
        ) : (
          requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              style={styles.requestCard}
              onPress={() => viewRequestDetails(req)}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestType}>{req.service_type}</Text>
                <Text style={styles.distance}>
                  {providerLocation ? 
                    `${calculateDistance(
                      providerLocation.latitude,
                      providerLocation.longitude,
                      parseFloat(req.latitude),
                      parseFloat(req.longitude)
                    )} km` : 'N/A'
                  }
                </Text>
              </View>
              <Text numberOfLines={2} style={styles.requestDescription}>
                {req.description || 'No description provided'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Request Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <Text style={styles.modalTitle}>{selectedRequest.service_type}</Text>
                <Text style={styles.modalText}>
                  <Text style={styles.label}>Customer:</Text> {selectedRequest.user_name}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.label}>Phone:</Text> {selectedRequest.user_phone}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.label}>Distance:</Text> {
                    providerLocation ? 
                    `${calculateDistance(
                      providerLocation.latitude,
                      providerLocation.longitude,
                      parseFloat(selectedRequest.latitude),
                      parseFloat(selectedRequest.longitude)
                    )} km` : 'N/A'
                  }
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.label}>Description:</Text> {selectedRequest.description}
                </Text>
                
                <View style={styles.modalButtons}>
                  <Button
                    title="Accept Request"
                    onPress={() => acceptRequest(selectedRequest)}
                    color="#4CAF50"
                  />
                  <View style={{ height: 10 }} />
                  <Button
                    title="Close"
                    onPress={() => setModalVisible(false)}
                    color="#999"
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  statusText: {
    marginTop: 5,
    fontSize: 16,
    color: '#666'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8
  },
  statCard: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  activeRequestCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2
  },
  activeRequestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  map: {
    height: 300,
    width: '100%',
    marginBottom: 8
  },
  requestList: {
    flex: 1
  },
  requestCard: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  requestType: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  distance: {
    color: '#2196F3'
  },
  requestDescription: {
    color: '#666'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8
  },
  modalButtons: {
    marginTop: 16
  },
  label: {
    fontWeight: 'bold',
    color: '#666'
  },
  logoutButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#f44336',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  noRequests: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666'
  }
});

export default ProviderDashboardScreen;
