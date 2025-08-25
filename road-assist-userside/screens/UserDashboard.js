import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, FlatList, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserDashboard = () => {
  const [location, setLocation] = useState(null); // User's current location
  const [nearbyProviders, setNearbyProviders] = useState([]); // List of nearby service providers
  const [userId, setUserId] = useState(null); // Logged-in user's ID
  const navigation = useNavigation(); // Navigation hook for routing

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


  // Get the user's location and match nearby providers
  useEffect(() => {
    (async () => {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }

      // Get the current location
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      try {
        // Request list of nearby providers from Python service
        const response = await axios.post('http://192.168.42.159:5001/match-providers', {
          latitude,
          longitude
        });
        setNearbyProviders(response.data || []);
      } catch (err) {
        console.error('Failed to fetch providers:', err);
        Alert.alert('Error', 'Could not fetch nearby providers');
      }
    })();
  }, []);

  // Send help request to the nearest provider
  const requestHelp = async () => {
    // Check if location and user ID are available
    if (!location || !userId) {
      Alert.alert('Missing information', 'Location or user ID is not ready');
      return;
    }

    try {
      // Step 1: Ask the Python API for the nearest provider
      const nearestRes = await axios.post('http://192.168.42.159:5001/find-nearest-provider', {
        latitude: location.latitude,
        longitude: location.longitude
      });

      const provider = nearestRes.data.provider;

      if (!provider) {
        Alert.alert('No available provider found');
        return;
      }

      // Step 2: Notify the Node.js backend about the help request
      await axios.post('http://192.168.42.159:5000/api/request-help', {
        user_id: userId,
        provider_id: provider.id,
        latitude: location.latitude,
        longitude: location.longitude,
        issue_type: 'Breakdown'
      });

      Alert.alert('✅ Help requested and assigned to nearest provider!');
    } catch (err) {
      console.error('Failed to send request:', err);
      Alert.alert('Error', 'Could not complete help request');
    }
  };

  // Clear stored user data and navigate to login screen
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // Render each nearby provider in a list
  const renderProvider = ({ item }) => (
    <View style={styles.card}>
      <Text>👨‍🔧 <Text style={styles.label}>Name:</Text> {item.name}</Text>
      <Text>📍 <Text style={styles.label}>Location:</Text> {item.latitude}, {item.longitude}</Text>
      <Text>📏 <Text style={styles.label}>Distance:</Text> {item.distance_km.toFixed(2)} km</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Road Assist User</Text>

      {/* Display user's current location and provider pins on the map */}
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          <Marker
            coordinate={location}
            title="Your Location"
            pinColor="blue"
          />
          {nearbyProviders.map(p => (
            <Marker
              key={p.id}
              coordinate={{ latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) }}
              title={p.name}
              pinColor="green"
            />
          ))}
        </MapView>
      )}

      {/* Action buttons */}
      <View style={styles.buttonGroup}>
        <Button title="Request Help" onPress={requestHelp} />
        <Button title="View History" onPress={() => navigation.navigate('RequestHistory')} />
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      {/* List of matched providers */}
      <Text style={styles.listTitle}>Nearby Providers:</Text>
      <FlatList
        data={nearbyProviders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProvider}
      />
    </View>
  );
};

// Styling for the component
const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', margin: 10 },
  map: { height: 250, marginHorizontal: 10, borderRadius: 8 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, marginTop: 10 },
  card: { backgroundColor: '#e7f3ff', padding: 10, marginVertical: 5, marginHorizontal: 10, borderRadius: 8 },
  label: { fontWeight: 'bold' }
});

export default UserDashboard;
