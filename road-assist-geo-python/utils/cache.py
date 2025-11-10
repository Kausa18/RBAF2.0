import redis
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class CacheWrapper:
    def __init__(self, redis_url='redis://localhost:6379/0', fallback_enabled=True):
        self.redis_client = None
        self.fallback_enabled = fallback_enabled
        self.redis_url = redis_url
        self._connect()

    def _connect(self):
        try:
            self.redis_client = redis.from_url(self.redis_url)
            self.redis_client.ping()
        except redis.ConnectionError as e:
            logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None

    def get(self, key, default=None):
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                return value.decode('utf-8') if value else default
            except redis.RedisError as e:
                logger.warning(f"Redis get error: {e}")
                return default
        return default

    def set(self, key, value, ex=None):
        if self.redis_client:
            try:
                self.redis_client.set(key, value, ex=ex)
                return True
            except redis.RedisError as e:
                logger.warning(f"Redis set error: {e}")
        return False

    def delete(self, key):
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return True
            except redis.RedisError as e:
                logger.warning(f"Redis delete error: {e}")
        return False

def cache_decorator(timeout=300):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(decorated_function, 'cache'):
                decorated_function.cache = CacheWrapper()
            
            # Create cache key from function name and arguments
            key = f"{f.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            result = decorated_function.cache.get(key)
            if result is not None:
                return result
            
            # If not in cache, compute and store
            result = f(*args, **kwargs)
            decorated_function.cache.set(key, result, ex=timeout)
            return result
        return decorated_function
    return decorator