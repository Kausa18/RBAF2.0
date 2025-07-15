import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RequestHistoryScreen = () => {
  const [requests, setRequests] = useState([]);

  const user = JSON.parse(localStorage.getItem('user')); // or use SecureStore/AsyncStorage
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    axios.get(`http://192.168.37.159:5000/api/user/${userId}/requests`)
      .then(res => setRequests(res.data))
      .catch(err => console.error('❌ Could not load request history:', err));
  }, [userId]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text>📍 Issue: {item.issue_type}</Text>
      <Text>📌 Location: ({item.latitude}, {item.longitude})</Text>
      <Text>🕒 Status: {item.status}</Text>
      <Text>📅 Date: {new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗂 Request History</Text>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: 'bold' },
  card: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 8 },
});

export default RequestHistoryScreen;
