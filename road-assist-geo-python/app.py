# Fixed Flask Backend - Nearest Provider Service
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from haversine import haversine
import mysql.connector
from mysql.connector import Error
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME', 'road_assist_db'),
    'autocommit': True,
    'connection_timeout': 10
}

def get_db_connection():
    """
    Create and return a new database connection.
    Returns None if connection fails.
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        logger.error(f"Database connection error: {e}")
        return None

def validate_coordinates(lat, lng):
    """
    Validate latitude and longitude values.
    Returns tuple (is_valid, error_message)
    """
    try:
        lat_float = float(lat)
        lng_float = float(lng)
        
        # Check if coordinates are within valid ranges
        if not (-90 <= lat_float <= 90):
            return False, "Latitude must be between -90 and 90"
        
        if not (-180 <= lng_float <= 180):
            return False, "Longitude must be between -180 and 180"
            
        return True, None
        
    except (TypeError, ValueError):
        return False, "Invalid coordinate format"

def safe_float_conversion(value, field_name):
    """
    Safely convert value to float with error handling.
    """
    try:
        return float(value)
    except (TypeError, ValueError) as e:
        logger.warning(f"Could not convert {field_name} '{value}' to float: {e}")
        return None

@app.route('/find-nearest-provider', methods=['POST'])
def find_nearest_provider():
    """
    Find the nearest available service provider based on user location.
    Expects JSON: {"latitude": float, "longitude": float}
    Returns: {"provider": provider_data, "distance_km": float} or error
    """
    try:
        # Validate request data
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.json
        if not data:
            return jsonify({'error': 'Empty request body'}), 400
        
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        
        # Check if coordinates are provided
        if user_lat is None or user_lng is None:
            return jsonify({
                'error': 'Both latitude and longitude are required',
                'received': {'latitude': user_lat, 'longitude': user_lng}
            }), 400
        
        # Validate coordinates
        is_valid, error_msg = validate_coordinates(user_lat, user_lng)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Convert to float for calculations
        user_lat_float = float(user_lat)
        user_lng_float = float(user_lng)
        user_coords = (user_lat_float, user_lng_float)
        
        # Get database connection
        db = get_db_connection()
        if not db:
            logger.error("Failed to establish database connection")
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cursor = db.cursor(dictionary=True)
            
            # Query for available providers
            query = "SELECT * FROM service_providers WHERE availability = 1"
            cursor.execute(query)
            providers = cursor.fetchall()
            
            logger.info(f"Found {len(providers)} available providers")
            
            if not providers:
                return jsonify({
                    'message': 'No providers currently available',
                    'available_count': 0
                }), 404
            
            # Find nearest provider
            nearest = None
            min_distance = float('inf')
            valid_providers = []
            
            for provider in providers:
                # Safely convert provider coordinates
                provider_lat = safe_float_conversion(provider.get('latitude'), 'provider latitude')
                provider_lng = safe_float_conversion(provider.get('longitude'), 'provider longitude')
                
                if provider_lat is None or provider_lng is None:
                    logger.warning(f"Skipping provider {provider.get('id', 'unknown')} - invalid coordinates")
                    continue
                
                # Validate provider coordinates
                is_valid_provider, _ = validate_coordinates(provider_lat, provider_lng)
                if not is_valid_provider:
                    logger.warning(f"Skipping provider {provider.get('id', 'unknown')} - coordinates out of range")
                    continue
                
                provider_coords = (provider_lat, provider_lng)
                
                try:
                    # Calculate distance using haversine formula
                    distance = haversine(user_coords, provider_coords)
                    valid_providers.append({
                        'provider': provider,
                        'distance': distance
                    })
                    
                    if distance < min_distance:
                        min_distance = distance
                        nearest = provider
                        
                except Exception as e:
                    logger.warning(f"Error calculating distance for provider {provider.get('id', 'unknown')}: {e}")
                    continue
            
            # Check if we found any valid providers
            if not nearest:
                return jsonify({
                    'message': 'No providers with valid coordinates found',
                    'total_providers': len(providers),
                    'valid_providers': 0
                }), 404
            
            # Prepare response
            response_data = {
                'provider': nearest,
                'distance_km': round(min_distance, 2),
                'total_providers_checked': len(providers),
                'valid_providers_found': len(valid_providers)
            }
            
            logger.info(f"Found nearest provider: ID {nearest.get('id')} at {min_distance:.2f}km")
            return jsonify(response_data), 200
            
        except Error as db_error:
            logger.error(f"Database query error: {db_error}")
            return jsonify({'error': 'Database query failed'}), 500
            
        finally:
            # Always close database connection
            if cursor:
                cursor.close()
            if db and db.is_connected():
                db.close()
                
    except Exception as e:
        logger.error(f"Unexpected error in find_nearest_provider: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/match-providers', methods=['POST'])
def match_providers():
    """
    Get all available providers with distances from user location.
    Expects JSON: {"latitude": float, "longitude": float}
    Returns: List of providers with distances
    """
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.json
        if not data:
            return jsonify({'error': 'Empty request body'}), 400
        
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        
        if user_lat is None or user_lng is None:
            return jsonify({'error': 'Both latitude and longitude are required'}), 400
        
        # Validate coordinates
        is_valid, error_msg = validate_coordinates(user_lat, user_lng)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        user_coords = (float(user_lat), float(user_lng))
        
        # Get database connection
        db = get_db_connection()
        if not db:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT * FROM service_providers WHERE availability = 1")
            providers = cursor.fetchall()
            
            providers_with_distance = []
            
            for provider in providers:
                provider_lat = safe_float_conversion(provider.get('latitude'), 'provider latitude')
                provider_lng = safe_float_conversion(provider.get('longitude'), 'provider longitude')
                
                if provider_lat is None or provider_lng is None:
                    continue
                
                is_valid_provider, _ = validate_coordinates(provider_lat, provider_lng)
                if not is_valid_provider:
                    continue
                
                try:
                    provider_coords = (provider_lat, provider_lng)
                    distance = haversine(user_coords, provider_coords)
                    
                    provider_data = provider.copy()
                    provider_data['distance_km'] = round(distance, 2)
                    providers_with_distance.append(provider_data)
                    
                except Exception as e:
                    logger.warning(f"Error calculating distance for provider {provider.get('id')}: {e}")
                    continue
            
            # Sort by distance
            providers_with_distance.sort(key=lambda x: x['distance_km'])
            
            return jsonify(providers_with_distance), 200
            
        except Error as db_error:
            logger.error(f"Database query error: {db_error}")
            return jsonify({'error': 'Database query failed'}), 500
            
        finally:
            if cursor:
                cursor.close()
            if db and db.is_connected():
                db.close()
                
    except Exception as e:
        logger.error(f"Unexpected error in match_providers: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify service status.
    """
    try:
        # Test database connection
        db = get_db_connection()
        if db:
            db.close()
            db_status = "connected"
        else:
            db_status = "disconnected"
        
        return jsonify({
            'status': 'healthy',
            'service': 'nearest-provider-service',
            'database': db_status,
            'version': '1.0.0'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check if required environment variables are set
    required_env_vars = ['DB_PASSWORD']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        exit(1)
    
    logger.info("Starting Nearest Provider Service...")
    logger.info(f"Database: {DB_CONFIG['user']}@{DB_CONFIG['host']}/{DB_CONFIG['database']}")
    
    app.run(
        host='0.0.0.0',  # Allow connections from any IP
        port=5001, 
        debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    )