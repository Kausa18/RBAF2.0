// components/Map/MapNative.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MapNative = ({ location, markers = [], onMarkerPress, style }) => {
  if (!location) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="location-searching" size={48} color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading location...</Text>
        </View>
      </View>
    );
  }

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  const openRequestLocation = (marker) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${marker.latitude},${marker.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapPlaceholder}>
        {/* Location Display */}
        <View style={styles.locationHeader}>
          <MaterialIcons name="my-location" size={48} color="#4ECDC4" />
          <Text style={styles.locationTitle}>Your Current Location</Text>
          <Text style={styles.locationCoords}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        </View>

        {/* Open Maps Button */}
        <TouchableOpacity 
          style={styles.openMapButton}
          onPress={openInGoogleMaps}
        >
          <MaterialIcons name="map" size={20} color="#FFFFFF" />
          <Text style={styles.openMapText}>Open in Google Maps</Text>
        </TouchableOpacity>

        {/* Service Requests */}
        {markers.length > 0 ? (
          <View style={styles.markersContainer}>
            <Text style={styles.markersTitle}>
              📍 Nearby Service Requests ({markers.length})
            </Text>
            <ScrollView 
              style={styles.markersList}
              showsVerticalScrollIndicator={false}
            >
              {markers.map((marker, index) => (
                <TouchableOpacity 
                  key={marker.id || index}
                  style={styles.markerItem}
                  onPress={() => {
                    if (onMarkerPress) onMarkerPress(marker);
                  }}
                  onLongPress={() => openRequestLocation(marker)}
                >
                  <View style={styles.markerLeft}>
                    <View style={styles.markerIcon}>
                      <MaterialIcons name="place" size={24} color="#E74C3C" />
                    </View>
                    <View style={styles.markerInfo}>
                      <Text style={styles.markerTitle} numberOfLines={1}>
                        {marker.title}
                      </Text>
                      <Text style={styles.markerDescription} numberOfLines={2}>
                        {marker.description}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => openRequestLocation(marker)}
                    style={styles.navigateButton}
                  >
                    <MaterialIcons name="directions" size={24} color="#4ECDC4" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.hint}>
              💡 Tap to view details • Hold to navigate
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color="#BDC3C7" />
            <Text style={styles.emptyText}>No service requests nearby</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 12,
  },
  mapPlaceholder: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  locationHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  locationCoords: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  openMapButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  openMapText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  markersContainer: {
    marginTop: 20,
  },
  markersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  markersList: {
    maxHeight: 300,
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  markerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  markerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  markerDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  navigateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 12,
  },
});

export default MapNative;