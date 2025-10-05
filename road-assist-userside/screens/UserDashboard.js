import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const UserDashboard = () => {
  const [location, setLocation] = useState(null);
  const [nearbyProviders, setNearbyProviders] = useState([]);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [serviceType, setServiceType] = useState('Breakdown');
  const [requestLoading, setRequestLoading] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const serviceTypes = [
    'Breakdown',
    'Flat Tire',
    'Battery Jump',
    'Fuel Delivery',
    'Lock Out',
    'Towing'
  ];

  // Load the logged-in user ID from local storage when the component mounts
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
      }
    } catch (err) {
      console.error('Failed to load user from storage:', err);
    }
  };
  loadUser();
}, []);


  // Start animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Function to get location and providers
  const fetchLocationAndProviders = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location services to find nearby providers.',
          [{ text: 'OK' }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      // Animate map to new location
      mapRef?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });

      const response = await axios.post('http://172.20.10.3:5001/match-providers', {
        latitude,
        longitude
      });
      
      setNearbyProviders(response.data || []);
    } catch (err) {
      console.error('Error:', err);
      Alert.alert(
        'Error',
        'Failed to fetch location or providers. Please try again.',
        [{ text: 'Retry', onPress: () => fetchLocationAndProviders() }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLocationAndProviders();
    }, [])
  );

  const requestHelp = async () => {
    if (!location || !userId || !selectedProvider) {
      Alert.alert('Error', 'Please select a provider first');
      return;
    }

    setRequestLoading(true);
    try {
      // Create the help request
      const response = await axios.post('http://172.20.10.3:5000/api/request-help', {
        user_id: userId,
        provider_id: selectedProvider.id,
        latitude: location.latitude,
        longitude: location.longitude,
        issue_type: serviceType,
        address: 'Current Location' // You could use reverse geocoding here
      });

      Alert.alert(
        'Success',
        'Help request sent successfully! The provider will contact you shortly.',
        [
          {
            text: 'View Request',
            onPress: () => navigation.navigate('RequestHistory')
          },
          { text: 'OK' }
        ]
      );
      setModalVisible(false);
    } catch (err) {
      console.error('Failed to send request:', err);
      Alert.alert(
        'Error',
        'Failed to send help request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setModalVisible(true);
    
    // Animate map to show both user and selected provider
    if (location && mapRef) {
      const midLat = (location.latitude + parseFloat(provider.latitude)) / 2;
      const midLng = (location.longitude + parseFloat(provider.longitude)) / 2;
      
      mapRef.animateToRegion({
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: LATITUDE_DELTA * 1.5,
        longitudeDelta: LONGITUDE_DELTA * 1.5,
      });
    }
  };

  // Clear stored user data and navigate to login screen
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderProvider = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        selectedProvider?.id === item.id && styles.selectedCard
      ]}
      onPress={() => handleProviderSelect(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {(item.rating || 4.5).toFixed(1)}
            </Text>
          </View>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color="#4ECDC4"
        />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#4ECDC4" />
          <Text style={styles.detailText}>
            {item.distance_km.toFixed(1)} km away
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="build" size={16} color="#4ECDC4" />
          <Text style={styles.detailText}>
            {item.services?.join(', ') || 'All Services'}
          </Text>
        </View>

        {item.availability && (
          <View style={[styles.badge, { backgroundColor: '#4ECDC4' }]}>
            <Text style={styles.badgeText}>Available Now</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Finding nearby providers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : '🚗 Road Assist'}
        </Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.mapContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {location && (
          <MapView
            ref={ref => setMapRef(ref)}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            <Circle
              center={location}
              radius={2000}
              fillColor="rgba(78, 205, 196, 0.2)"
              strokeColor="rgba(78, 205, 196, 0.5)"
            />
            
            {nearbyProviders.map(provider => (
              <Marker
                key={provider.id}
                coordinate={{
                  latitude: parseFloat(provider.latitude),
                  longitude: parseFloat(provider.longitude)
                }}
                title={provider.name}
                description={`${provider.distance_km.toFixed(1)} km away`}
                pinColor={selectedProvider?.id === provider.id ? '#4ECDC4' : '#2C3E50'}
              />
            ))}
          </MapView>
        )}
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('RequestHistory')}
          >
            <MaterialIcons name="history" size={24} color="#4ECDC4" />
            <Text style={styles.buttonText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              fetchLocationAndProviders();
            }}
          >
            <MaterialIcons name="refresh" size={24} color="#4ECDC4" />
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Nearby Providers
          <Text style={styles.providerCount}> ({nearbyProviders.length})</Text>
        </Text>

        <FlatList
          data={nearbyProviders}
          keyExtractor={item => item.id.toString()}
          renderItem={renderProvider}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLocationAndProviders();
              }}
              colors={['#4ECDC4']}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Assistance</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#95A5A6" />
              </TouchableOpacity>
            </View>

            {selectedProvider && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.providerDetail}>
                  <Text style={styles.providerDetailName}>{selectedProvider.name}</Text>
                  <Text style={styles.providerDetailDistance}>
                    {selectedProvider.distance_km.toFixed(1)} km away
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Service Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.serviceTypesContainer}
                >
                  {serviceTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.serviceTypeButton,
                        serviceType === type && styles.serviceTypeButtonActive
                      ]}
                      onPress={() => setServiceType(type)}
                    >
                      <Text
                        style={[
                          styles.serviceTypeText,
                          serviceType === type && styles.serviceTypeTextActive
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.requestButton,
                    requestLoading && styles.requestButtonDisabled
                  ]}
                  onPress={requestHelp}
                  disabled={requestLoading}
                >
                  {requestLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.requestButtonText}>
                      Request Assistance
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2C3E50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  logoutButton: {
    padding: 8,
  },
  mapContainer: {
    height: 300,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2C3E50',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  providerCount: {
    color: '#95A5A6',
    fontSize: 18,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedCard: {
    borderColor: '#4ECDC4',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    color: '#2C3E50',
  },
  cardDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 10,
    color: '#7F8C8D',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4ECDC4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '50%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    maxHeight: '80%',
  },
  providerDetail: {
    marginBottom: 20,
  },
  providerDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  providerDetailDistance: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  serviceTypesContainer: {
    marginVertical: 15,
  },
  serviceTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    marginRight: 10,
  },
  serviceTypeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  serviceTypeText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
  serviceTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  requestButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  requestButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UserDashboard;
