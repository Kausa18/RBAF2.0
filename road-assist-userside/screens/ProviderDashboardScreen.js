import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

const ProviderDashboardScreen = () => {
  const [requests, setRequests] = useState([]);
  const providerId = 1; // TODO: Replace with actual logged-in provider ID
  const navigation = useNavigation(); // Hook inside component

  // Periodically send provider location to server when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      let interval = setInterval(() => {
        Location.getCurrentPositionAsync({})
          .then(loc => {
            const { latitude, longitude } = loc.coords;
            axios.put(`http://192.168.37.159:5000/api/update-location/${providerId}`, {
              latitude,
              longitude
            });
          })
          .catch(err => console.log('📍 Location error:', err));
      }, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  // Fetch open requests
  useEffect(() => {
    axios.get('http://192.168.37.159:5000/api/open-requests')
      .then(res => setRequests(res.data))
      .catch(err => {
        console.error('❌ Failed to load requests:', err);
        Alert.alert('Error', 'Could not load requests.');
      });
  }, []);

  // Accept request
  const acceptRequest = (requestId) => {
    axios.put(`http://192.168.37.159:5000/api/assign-request/${requestId}`, {
      provider_id: providerId
    })
    .then(() => {
      Alert.alert('Success', '✅ Request accepted!');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    })
    .catch(err => {
      console.error('❌ Failed to accept request:', err);
      Alert.alert('Error', 'Could not accept the request.');
    });
  };

  // Logout function
  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📋 Open Requests</Text>

      {requests.length === 0 ? (
        <Text>No open requests available.</Text>
      ) : (
        requests.map(req => (
          <View key={req.id} style={styles.card}>
            <Text><Text style={styles.label}>Issue:</Text> {req.issue_type}</Text>
            <Text><Text style={styles.label}>Location:</Text> {req.latitude}, {req.longitude}</Text>

            <MapView
              style={styles.map}
              region={{
                latitude: parseFloat(req.latitude),
                longitude: parseFloat(req.longitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: parseFloat(req.latitude), longitude: parseFloat(req.longitude) }}
                title="Customer Location"
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
  container: {
    padding: 15
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  card: {
    marginBottom: 25,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    elevation: 2
  },
  label: {
    fontWeight: 'bold'
  },
  map: {
    width: '100%',
    height: 200,
    marginVertical: 10
  }
});

export default ProviderDashboardScreen;
