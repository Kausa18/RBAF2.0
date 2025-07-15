import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const SignupScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'user', // default role
  });

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSignup = async () => {
    try {
      const res = await axios.post('http://192.168.37.159:5000/api/signup', form);
      Alert.alert('✅ Signup successful! Please log in.');
      navigation.navigate('Login');
    } catch (err) {
  console.error('Signup error:', err.message);

  if (err.response && err.response.data?.message) {
    Alert.alert('❌ ' + err.response.data.message);
  } else if (err.message === 'Network Error') {
    Alert.alert('❌ Network error. Make sure your phone and PC are on the same Wi-Fi.');
  } else {
    Alert.alert('❌ Something went wrong.');
  }
      }

  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 15 }}>Signup</Text>

      <TextInput
        placeholder="Name"
        value={form.name}
        onChangeText={text => handleChange('name', text)}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <TextInput
        placeholder="Email"
        value={form.email}
        onChangeText={text => handleChange('email', text)}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        value={form.password}
        onChangeText={text => handleChange('password', text)}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
        secureTextEntry
      />

      <TextInput
        placeholder="Phone"
        value={form.phone}
        onChangeText={text => handleChange('phone', text)}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
        keyboardType="phone-pad"
      />

      <Picker
        selectedValue={form.role}
        onValueChange={value => handleChange('role', value)}
        style={{ marginBottom: 20 }}
      >
        <Picker.Item label="User" value="user" />
        <Picker.Item label="Provider" value="provider" />
      </Picker>

      <Button title="Register" onPress={handleSignup} />
    </View>
  );
};

export default SignupScreen;
