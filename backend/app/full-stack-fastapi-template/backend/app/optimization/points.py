import math
import random

METRES_PAR_DEGRE = 111320


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
    echelle = math.cos(math.radians(sum(p[0] for p in positions) / len(positions)))
    plans = [(p[0] * METRES_PAR_DEGRE, p[1] * METRES_PAR_DEGRE * echelle) for p in positions]

    def ecart(a: tuple[float, float], b: tuple[float, float]) -> float:
        return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

    premier = hasard.randrange(len(plans))
    centres = [plans[premier]]
    plus_proche = [ecart(p, centres[0]) for p in plans]
    while len(centres) < nombre:
        ponderes = [d * w for d, w in zip(plus_proche, poids, strict=False)]
        total = sum(ponderes) or 1
        tirage = hasard.random() * total
        cumul = 0.0
        choisi = plans[-1]
        for p, d in zip(plans, ponderes, strict=False):
            cumul += d
            if cumul >= tirage:
                choisi = p
                break
        centres.append(choisi)
        plus_proche = [min(d, ecart(p, choisi)) for p, d in zip(plans, plus_proche, strict=False)]
    for _ in range(iterations):
        sommes = [[0.0, 0.0, 0.0] for _ in centres]
        for p, w in zip(plans, poids, strict=False):
            meilleur = 0
            distance = ecart(p, centres[0])
            for k in range(1, len(centres)):
                d = ecart(p, centres[k])
                if d < distance:
                    meilleur, distance = k, d
            somme = sommes[meilleur]
            somme[0] += p[0] * w
            somme[1] += p[1] * w
            somme[2] += w
        nouveaux = [(s[0] / s[2], s[1] / s[2]) if s[2] else c for s, c in zip(sommes, centres, strict=False)]
        stable = all(ecart(a, b) < 1 for a, b in zip(centres, nouveaux, strict=False))
        centres = nouveaux
        if stable:
            break
    return [(c[0] / METRES_PAR_DEGRE, c[1] / (METRES_PAR_DEGRE * echelle)) for c in centres]


def nombre_de_points(menages: int, menages_par_point: int) -> int:
    return max(1, math.ceil(menages / max(1, menages_par_point)))
