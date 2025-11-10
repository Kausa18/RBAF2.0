from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Any
from utils.cache import cache_decorator
import logging

logger = logging.getLogger(__name__)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on Earth."""
    R = 6371  # Earth's radius in kilometers

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

@cache_decorator(timeout=60)  # Cache results for 1 minute
def match_providers(cursor, user_lat: float, user_lon: float, service_type: str = None, max_distance: float = 50.0) -> List[Dict[str, Any]]:
    """Match providers based on location and service type with optimized query."""
    try:
        # Base query with LIMIT and optimized JOIN
        query = """
        SELECT 
            p.id,
            p.name,
            p.latitude,
            p.longitude,
            p.service_types,
            p.rating,
            p.total_jobs,
            p.availability,
            SQRT(
                POW(69.1 * (p.latitude - %s), 2) +
                POW(69.1 * (%s - p.longitude) * COS(p.latitude / 57.3), 2)
            ) AS distance
        FROM providers p
        WHERE p.status = 'active'
        AND p.availability = 'available'
        HAVING distance <= %s
        """
        
        params = [user_lat, user_lon, max_distance]
        
        # Add service type filter if specified
        if service_type:
            query += " AND JSON_CONTAINS(p.service_types, %s)"
            params.append(f'"{service_type}"')
        
        # Order by distance and limit results
        query += " ORDER BY distance LIMIT 20"
        
        # Execute query with timeout
        cursor.execute("SET SESSION MAX_EXECUTION_TIME=2000")  # 2 second timeout
        cursor.execute(query, params)
        
        providers = cursor.fetchall()
        
        # Process and format results
        results = []
        for provider in providers:
            results.append({
                'id': provider['id'],
                'name': provider['name'],
                'distance': round(provider['distance'], 2),
                'service_types': provider['service_types'],
                'rating': provider['rating'],
                'total_jobs': provider['total_jobs'],
                'availability': provider['availability']
            })
        
        return results
        
    except Exception as e:
        logger.error(f"Provider matching error: {str(e)}")
        return []