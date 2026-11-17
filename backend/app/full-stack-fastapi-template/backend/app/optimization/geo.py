import math

RAYON_TERRE_M = 6371000
FACTEUR_ROUTE = 1.3


def distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * RAYON_TERRE_M * math.asin(math.sqrt(h))


def distance_route_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    return distance_m(a, b) * FACTEUR_ROUTE / 1000


def decaler(centre: tuple[float, float], est_m: float, nord_m: float) -> tuple[float, float]:
    lat = centre[0] + nord_m / 111320
    lng = centre[1] + est_m / (111320 * math.cos(math.radians(centre[0])))
    return (lat, lng)
