import math

from .geo import distance_route_km


def _longueur(chemin: list[tuple[float, float]]) -> float:
    return sum(distance_route_km(chemin[i], chemin[i + 1]) for i in range(len(chemin) - 1))


def _deux_opt(depot: tuple[float, float], ordre: list[dict]) -> list[dict]:
    meilleur = ordre[:]
    ameliore = True
    while ameliore and len(meilleur) > 3:
        ameliore = False
        for i in range(len(meilleur) - 1):
            for j in range(i + 2, len(meilleur)):
                essai = meilleur[: i + 1] + meilleur[i + 1 : j + 1][::-1] + meilleur[j + 1 :]
                avant = [depot] + [p["position"] for p in meilleur] + [depot]
                apres = [depot] + [p["position"] for p in essai] + [depot]
                if _longueur(apres) + 1e-9 < _longueur(avant):
                    meilleur = essai
                    ameliore = True
    return meilleur


def _plus_proche_voisin(depot: tuple[float, float], points: list[dict]) -> list[dict]:
    restants = points[:]
    ordre = []
    courant = depot
    while restants:
        suivant = min(restants, key=lambda p: distance_route_km(courant, p["position"]))
        ordre.append(suivant)
        restants.remove(suivant)
        courant = suivant["position"]
    return ordre


def planifier_tournees(
    depot: tuple[float, float],
    points: list[dict],
    camions: int,
    capacite_par_camion_t: float,
) -> dict:
    if camions <= 0 or not points:
        return {"tournees": [], "non_desservis": [p["id"] for p in points], "charge_non_desservie_t": round(sum(p["charge_t"] for p in points), 2)}

    def angle(p: dict) -> float:
        return math.atan2(p["position"][0] - depot[0], p["position"][1] - depot[1])

    tries = sorted(points, key=angle)
    groupes: list[list[dict]] = [[] for _ in range(camions)]
    charges = [0.0] * camions
    non_desservis = []
    cible = sum(p["charge_t"] for p in points) / camions
    camion = 0
    for point in tries:
        while camion < camions - 1 and charges[camion] >= min(cible, capacite_par_camion_t):
            camion += 1
        if charges[camion] + point["charge_t"] <= capacite_par_camion_t:
            groupes[camion].append(point)
            charges[camion] += point["charge_t"]
            continue
        libre = next((k for k in range(camions) if charges[k] + point["charge_t"] <= capacite_par_camion_t), None)
        if libre is None:
            non_desservis.append(point)
        else:
            groupes[libre].append(point)
            charges[libre] += point["charge_t"]

    tournees = []
    for numero, groupe in enumerate(groupes, start=1):
        if not groupe:
            continue
        ordre = _deux_opt(depot, _plus_proche_voisin(depot, groupe))
        chemin = [depot] + [p["position"] for p in ordre] + [depot]
        longueur = _longueur(chemin)
        tournees.append(
            {
                "camion": numero,
                "points": [p["id"] for p in ordre],
                "chemin": [[round(lat, 6), round(lng, 6)] for lat, lng in chemin],
                "distance_km": round(longueur, 1),
                "duree_h": round(longueur / 20 + 0.25 * len(ordre), 1),
                "charge_t": round(sum(p["charge_t"] for p in ordre), 2),
            }
        )
    return {
        "tournees": tournees,
        "non_desservis": [p["id"] for p in non_desservis],
        "charge_non_desservie_t": round(sum(p["charge_t"] for p in non_desservis), 2),
    }
