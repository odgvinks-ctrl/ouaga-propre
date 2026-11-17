import math
import random

from .geo import distance_m


def placer_points(
    positions: list[tuple[float, float]],
    poids: list[float],
    nombre: int,
    graine: int = 0,
    iterations: int = 25,
) -> list[tuple[float, float]]:
    if not positions:
        return []
    nombre = max(1, min(nombre, len(positions)))
    hasard = random.Random(graine)
    centres = [positions[hasard.randrange(len(positions))]]
    while len(centres) < nombre:
        distances = [min(distance_m(p, c) for c in centres) ** 2 * w for p, w in zip(positions, poids)]
        total = sum(distances) or 1
        tirage = hasard.random() * total
        cumul = 0.0
        for p, d in zip(positions, distances):
            cumul += d
            if cumul >= tirage:
                centres.append(p)
                break
    for _ in range(iterations):
        groupes: list[list[int]] = [[] for _ in centres]
        for i, p in enumerate(positions):
            proche = min(range(len(centres)), key=lambda k: distance_m(p, centres[k]))
            groupes[proche].append(i)
        nouveaux = []
        for k, groupe in enumerate(groupes):
            if not groupe:
                nouveaux.append(centres[k])
                continue
            masse = sum(poids[i] for i in groupe) or 1
            lat = sum(positions[i][0] * poids[i] for i in groupe) / masse
            lng = sum(positions[i][1] * poids[i] for i in groupe) / masse
            nouveaux.append((lat, lng))
        if all(distance_m(a, b) < 1 for a, b in zip(centres, nouveaux)):
            centres = nouveaux
            break
        centres = nouveaux
    return centres


def nombre_de_points(menages: int, menages_par_point: int) -> int:
    return max(1, math.ceil(menages / max(1, menages_par_point)))
