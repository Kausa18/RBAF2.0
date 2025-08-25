import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';

const ProviderDashboardScreen = () => {
  const [requests, setRequests] = useState([]);
  const [providerLocation, setProviderLocation] = useState(null);
  const navigation = useNavigation();

  const providerId = 1; // 👈 Replace with real provider ID if you have auth

  // Fetch open requests from backend
  useEffect(() => {
    axios.get('http://192.168.42.159:5000/api/open-requests')
      .then(res => setRequests(res.data))
      .catch(err => {
        console.error('❌ Error fetching requests:', err);
        Alert.alert('Error', 'Could not fetch requests');
      });
  }, []);

  // Track provider's location in real-time every 10 seconds
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        Location.getCurrentPositionAsync({})
          .then((loc) => {
            setProviderLocation(loc.coords);
            axios.put(`http://192.168.42.159:5000/api/update-location/${providerId}`, {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          })
          .catch((err) => console.log('📍 Location error:', err));
      }, 10000);

      return () => clearInterval(interval);
    }, [])
  );

  // Accept a help request
  const acceptRequest = (requestId) => {
    axios.put(`http://192.168.42.159:5000/api/assign-request/${requestId}`, {
      provider_id: providerId
    })
      .then(() => {
        Alert.alert('✅ Accepted', 'Request has been accepted!');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      })
      .catch(err => {
        console.error('❌ Accept error:', err);
        Alert.alert('Error', 'Failed to accept request');
      });
  };

  const handleLogout = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>🔧 Provider Dashboard</Text>

      {requests.length === 0 ? (
        <Text>No open requests found.</Text>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.card}>
            <Text><Text style={styles.label}>Issue:</Text> {req.issue_type}</Text>
            <Text><Text style={styles.label}>Location:</Text> {req.latitude}, {req.longitude}</Text>

            <MapView
              style={styles.map}
              region={{
                latitude: parseFloat(req.latitude),
                longitude: parseFloat(req.longitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
            >
              <Marker
                coordinate={{ latitude: parseFloat(req.latitude), longitude: parseFloat(req.longitude) }}
                title="Customer"
              />
            </MapView>

            <Button title="✅ Accept Request" onPress={() => acceptRequest(req.id)} />
            <View style={{ marginTop: 8 }} />
            <Button title="Logout" onPress={handleLogout} color="red" />
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: {
    backgroundColor: '#f1f1f1',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8
  },
  label: { fontWeight: 'bold' },
  map: { height: 200, width: '100%', marginVertical: 10 }
});

export default ProviderDashboardScreen;
