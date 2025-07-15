from flask import Flask, request, jsonify
from haversine import haversine
import mysql.connector

app = Flask(__name__)
# Ensure you have the MySQL connector installed: pip install mysql-connector-python
# Connect to MySQL (adjust credentials as needed)
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",  # set your password if any
    database="road_assist_db"
)

@app.route('/find-nearest-provider', methods=['POST'])
def find_nearest_provider():
    data = request.json
    user_lat = data.get('latitude')
    user_lng = data.get('longitude')

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM service_providers WHERE availability = 1")
    providers = cursor.fetchall()

    nearest = None
    min_distance = float('inf')

    for provider in providers:
        provider_coords = (float(provider['latitude']), float(provider['longitude']))
        user_coords = (float(user_lat), float(user_lng))
        distance = haversine(user_coords, provider_coords)

        if distance < min_distance:
            min_distance = distance
            nearest = provider

    if nearest:
        return jsonify({'provider': nearest, 'distance_km': min_distance})
    else:
        return jsonify({'message': 'No providers available'}), 404

if __name__ == '__main__':
    app.run(port=5001, debug=True)
