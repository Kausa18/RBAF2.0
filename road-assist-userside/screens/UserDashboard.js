import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, FlatList, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

const UserDashboard = () => {
  const [location, setLocation] = useState(null);
  const [nearbyProviders, setNearbyProviders] = useState([]);
  const navigation = useNavigation();

  // Get current location and match providers
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      // Call Python API to match providers
      try {
        const response = await axios.post('http://192.168.37.159:5001/match-providers', {
          latitude,
          longitude
        });
        setNearbyProviders(response.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch providers:', err);
        Alert.alert('Error', 'Could not fetch nearby providers');
      }
    })();
  }, []);

  // Send help request to backend
  const requestHelp = async () => {
  if (!location) {
    Alert.alert('Location not ready');
    return;
  }

  try {
    // Step 1: Find the nearest provider using Python API
    const nearestRes = await axios.post('http://192.168.37.159:5001/find-nearest-provider', {
      latitude: location.latitude,
      longitude: location.longitude
    });

    const provider = nearestRes.data.provider;

    if (!provider) {
      Alert.alert('❌ No available provider found');
      return;
    }

    // Step 2: Send help request to Node.js backend
    await axios.post('http://192.168.37.159:5000/api/request-help', {
      user_id: 1, // Replace with actual logged-in user ID
      provider_id: provider.id,
      latitude: location.latitude,
      longitude: location.longitude,
      issue_type: 'Breakdown'
    });

    Alert.alert('✅ Help requested and assigned to nearest provider!');
  } catch (err) {
    console.error('❌ Failed to send request:', err);
    Alert.alert('Error', 'Could not complete help request');
  }
};

  // Logout and reset navigation stack
  const handleLogout = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

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

      <View style={styles.buttonGroup}>
        <Button title="Request Help" onPress={requestHelp} />
        <Button title="View History" onPress={() => navigation.navigate('RequestHistory')} />
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      <Text style={styles.listTitle}>Nearby Providers:</Text>
      <FlatList
        data={nearbyProviders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProvider}
      />
    </View>
  );
};

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
