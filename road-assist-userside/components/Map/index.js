// components/Map/index.js
import { Platform } from 'react-native';

// Import platform-specific components
import MapNative from './MapNative';
import MapWeb from './MapWeb';

// Export the appropriate component based on platform
const Map = Platform.OS === 'web' ? MapWeb : MapNative;

export default Map;