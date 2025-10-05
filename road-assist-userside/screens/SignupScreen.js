import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const SignupScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'user', // default role
    // Provider-specific fields
    businessName: '',
    serviceArea: '',
    serviceTypes: [],
    experience: '',
    licenseNumber: '',
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Available service types for providers
  const serviceTypes = [
    'Towing Service',
    'Battery Jump Start',
    'Flat Tire Change',
    'Fuel Delivery',
    'Lockout Service',
    'Minor Repairs',
    'Winching Service',
  ];

  // Start animation on mount
  React.useEffect(() => {
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

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const toggleServiceType = (service) => {
    let updatedServices;
    if (selectedServices.includes(service)) {
      updatedServices = selectedServices.filter(s => s !== service);
    } else {
      updatedServices = [...selectedServices, service];
    }
    setSelectedServices(updatedServices);
    handleChange('serviceTypes', updatedServices);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Common validation
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Provider-specific validation
    if (form.role === 'provider') {
      if (!form.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
      
      if (!form.serviceArea.trim()) {
        newErrors.serviceArea = 'Service area is required';
      }
      
      if (selectedServices.length === 0) {
        newErrors.serviceTypes = 'At least one service type must be selected';
      }
      
      if (!form.experience.trim()) {
        newErrors.experience = 'Years of experience is required';
      } else if (isNaN(form.experience) || form.experience < 0) {
        newErrors.experience = 'Please enter a valid number of years';
      }
      
      if (!form.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License number is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const signupData = {
        ...form,
        serviceTypes: selectedServices,
      };

      const res = await axios.post('http://172.20.10.3:5000/api/signup', signupData);
      
      if (form.role === 'provider') {
        Alert.alert(
          'Provider Account Created',
          'Your provider account has been created successfully! Your account will be reviewed within 24-48 hours. You will receive an email notification once approved.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('ProviderPending', { email: form.email })
          }]
        );
      } else {
        Alert.alert(
          'Success',
          'Account created successfully! Please log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (err) {
      console.error('Signup error:', err.message);

      if (err.response && err.response.data?.message) {
        Alert.alert('Error', err.response.data.message);
      } else if (err.message === 'Network Error') {
        Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderProviderFields = () => {
    if (form.role !== 'provider') return null;

    return (
      <Animated.View style={styles.providerSection}>
        <Text style={styles.sectionTitle}>Provider Information</Text>

        <View style={styles.inputGroup}>
          <MaterialIcons name="business" size={24} color="#4ECDC4" style={styles.inputIcon} />
          <TextInput
            placeholder="Business Name"
            value={form.businessName}
            onChangeText={text => handleChange('businessName', text)}
            style={styles.input}
            placeholderTextColor="#95A5A6"
          />
        </View>
        {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}

        <View style={styles.inputGroup}>
          <MaterialIcons name="location-on" size={24} color="#4ECDC4" style={styles.inputIcon} />
          <TextInput
            placeholder="Service Area (e.g., Lusaka Central)"
            value={form.serviceArea}
            onChangeText={text => handleChange('serviceArea', text)}
            style={styles.input}
            placeholderTextColor="#95A5A6"
          />
        </View>
        {errors.serviceArea && <Text style={styles.errorText}>{errors.serviceArea}</Text>}

        <View style={styles.inputGroup}>
          <MaterialIcons name="work" size={24} color="#4ECDC4" style={styles.inputIcon} />
          <TextInput
            placeholder="Years of Experience"
            value={form.experience}
            onChangeText={text => handleChange('experience', text)}
            style={styles.input}
            keyboardType="numeric"
            placeholderTextColor="#95A5A6"
          />
        </View>
        {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}

        <View style={styles.inputGroup}>
          <MaterialIcons name="verified" size={24} color="#4ECDC4" style={styles.inputIcon} />
          <TextInput
            placeholder="License/Registration Number"
            value={form.licenseNumber}
            onChangeText={text => handleChange('licenseNumber', text)}
            style={styles.input}
            placeholderTextColor="#95A5A6"
          />
        </View>
        {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}

        <Text style={styles.serviceLabel}>Services Offered:</Text>
        <View style={styles.serviceContainer}>
          {serviceTypes.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.serviceChip,
                selectedServices.includes(service) && styles.serviceChipSelected
              ]}
              onPress={() => toggleServiceType(service)}
            >
              <Text style={[
                styles.serviceText,
                selectedServices.includes(service) && styles.serviceTextSelected
              ]}>
                {service}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.serviceTypes && <Text style={styles.errorText}>{errors.serviceTypes}</Text>}
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Please fill in the details below</Text>

          <View style={styles.inputGroup}>
            <MaterialIcons name="person" size={24} color="#4ECDC4" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name"
              value={form.name}
              onChangeText={text => handleChange('name', text)}
              style={styles.input}
              placeholderTextColor="#95A5A6"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.inputGroup}>
            <MaterialIcons name="email" size={24} color="#4ECDC4" style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              value={form.email}
              onChangeText={text => handleChange('email', text)}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#95A5A6"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.inputGroup}>
            <MaterialIcons name="lock" size={24} color="#4ECDC4" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              value={form.password}
              onChangeText={text => handleChange('password', text)}
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword}
              placeholderTextColor="#95A5A6"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color="#95A5A6"
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <View style={styles.inputGroup}>
            <MaterialIcons name="phone" size={24} color="#4ECDC4" style={styles.inputIcon} />
            <TextInput
              placeholder="Phone Number"
              value={form.phone}
              onChangeText={text => handleChange('phone', text)}
              style={styles.input}
              keyboardType="phone-pad"
              placeholderTextColor="#95A5A6"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.pickerContainer}>
            <MaterialIcons name="person-outline" size={24} color="#4ECDC4" style={styles.inputIcon} />
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.role}
                onValueChange={value => handleChange('role', value)}
                style={styles.picker}
              >
                <Picker.Item label="Register as User" value="user" />
                <Picker.Item label="Register as Service Provider" value="provider" />
              </Picker>
            </View>
          </View>

          {renderProviderFields()}

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>
                {form.role === 'provider' ? 'Create Provider Account' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 5,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 15,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerWrapper: {
    flex: 1,
  },
  picker: {
    color: '#2C3E50',
  },
  passwordToggle: {
    padding: 10,
  },
  providerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
    marginLeft: 5,
  },
  serviceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  serviceChip: {
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceChipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  serviceText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontWeight: '500',
  },
  serviceTextSelected: {
    color: '#FFFFFF',
  },
  signupButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
  loginLinkTextBold: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
});

export default SignupScreen;