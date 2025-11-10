// components/Map/MapWeb.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapWeb = ({ location, style }) => {
  if (!location) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.text}>Loading map...</Text>
      </View>
    );
  }

  const mapUrl = `https://www.google.com/maps/embed/v1/view?key=YOUR_API_KEY&center=${location.latitude},${location.longitude}&zoom=14`;

  return (
    <View style={[styles.container, style]}>
      <iframe
        title="Google Map"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={mapUrl}
        allowFullScreen
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  text: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 150,
  },
});

export default MapWeb;
