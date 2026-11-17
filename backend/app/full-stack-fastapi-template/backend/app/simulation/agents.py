import math
from dataclasses import dataclass, field


@dataclass
class Depotoir:
    id: int
    quartier: str
    position: tuple[float, float]
    tonnes: float = 0.0
    cree_jour: int = 0
    signale: bool = False
    verifie: bool = False
    nettoye_jour: int | None = None

    @property
    def actif(self) -> bool:
        return self.nettoye_jour is None and self.tonnes > 0.001


@dataclass
class PointRegroupement:
    id: str
    quartier: str
    position: tuple[float, float]
    capacite_t: float
    contenu_t: float = 0.0
    deborde_jour: int | None = None
    propose: bool = False

    def deposer(self, tonnes: float, jour: int) -> float:
        place = max(0.0, self.capacite_t - self.contenu_t)
        accepte = min(place, tonnes)
        self.contenu_t += accepte
        surplus = tonnes - accepte
        if surplus > 1e-6 and self.deborde_jour is None:
            self.deborde_jour = jour
        return surplus


@dataclass
class Menage:
    id: int
    quartier: str
    position: tuple[float, float]
    nombre: int
    abonne: bool
    point: str | None = None
    stock_kg: float = 0.0
    jours_sans_passage: int = 0

    def step(self, ville, jour: int) -> None:
        p = ville.p
        production = self.nombre * p["population"]["kg_par_menage_jour"] * ville.facteur_production
        ville.jour_courant["production_t"] += production / 1000
        if self.abonne:
            self.stock_kg += production
            self.jours_sans_passage += 1
            if self.jours_sans_passage > p["population"]["jours_avant_debordement"]:
                jete = self.stock_kg * 0.5
                self.stock_kg -= jete
                ville.jeter(self.quartier, self.position, jete / 1000, jour)
            return
        part = p["population"]["part_depotoir_non_abonnes"]
        ville.jeter(self.quartier, self.position, production * part / 1000, jour)
        ville.jour_courant["autre_filiere_t"] += production * (1 - part) / 1000


@dataclass
class PreCollecteur:
    id: int
    quartier: str

    def step(self, ville, jour: int) -> None:
        p = ville.p
        capacite = (
            p["pre_collecte"]["capacite_tricycle_t"]
            * p["pre_collecte"]["tours_par_jour"]
            * ville.facteur_tricycles
            * 1000
        )
        dus = [
            m
            for m in ville.menages_par_quartier.get(self.quartier, [])
            if m.abonne and m.jours_sans_passage >= p["pre_collecte"]["frequence_passage_jours"] and m.stock_kg > 0
        ]
        dus.sort(key=lambda m: m.stock_kg, reverse=True)
        for menage in dus:
            if capacite <= 0:
                break
            if menage.id in ville.servis_du_jour:
                continue
            pris = min(menage.stock_kg, capacite)
            capacite -= pris
            menage.stock_kg -= pris
            if menage.stock_kg <= 1e-6:
                menage.jours_sans_passage = 0
            ville.servis_du_jour.add(menage.id)
            ville.jour_courant["precollecte_t"] += pris / 1000
            point = ville.points[menage.point] if menage.point in ville.points else None
            if point is None:
                ville.jeter(self.quartier, menage.position, pris / 1000, jour)
                continue
            surplus = point.deposer(pris / 1000, jour)
            if surplus > 0:
                ville.jeter(point.quartier, point.position, surplus, jour)


@dataclass
class Camion:
    id: int
    en_panne: bool
    tournee: list[str] = field(default_factory=list)

    def step(self, ville, jour: int) -> None:
        if self.en_panne:
            return
        p = ville.p
        for _ in range(p["transport"]["rotations_par_jour"]):
            capacite = p["transport"]["capacite_camion_t"] * ville.facteur_camions
            ville.jour_courant["capacite_camions_t"] += capacite
            for identifiant in self.tournee:
                if capacite <= 0:
                    break
                point = ville.points[identifiant]
                pris = min(point.contenu_t, capacite)
                point.contenu_t -= pris
                capacite -= pris
                ville.jour_courant["evacue_t"] += pris


@dataclass
class BrigadeLaabal:
    agents: int

    def step(self, ville, jour: int) -> None:
        p = ville.p
        capacite = self.agents * p["brigade_laabal"]["tonnes_par_agent_jour"] * ville.facteur_brigade
        capacite = max(0.0, capacite - ville.jour_courant["tonnes_perdues_pieges"])
        cibles = sorted((d for d in ville.depotoirs if d.actif and d.verifie), key=lambda d: d.tonnes, reverse=True)
        for depotoir in cibles:
            if capacite <= 0:
                break
            pris = min(depotoir.tonnes, capacite)
            depotoir.tonnes -= pris
            capacite -= pris
            ville.jour_courant["nettoye_t"] += pris
            if depotoir.tonnes <= 0.001:
                depotoir.tonnes = 0
                depotoir.nettoye_jour = jour
                ville.delais.append(jour - depotoir.cree_jour)


@dataclass
class Mairie:
    verifications_par_jour: int
    file: list = field(default_factory=list)

    def step(self, ville, jour: int) -> None:
        p = ville.p
        hasard = ville.hasard
        nouveaux = [d for d in ville.depotoirs if d.actif and not d.signale and hasard.random() < p["population"]["probabilite_signalement"]]
        for depotoir in nouveaux:
            depotoir.signale = True
            self.file.append(("vrai", depotoir))
        taux = p["mairie"]["taux_pieges"] / 100
        attendus = len(nouveaux) * taux / max(0.05, 1 - taux)
        faux = int(attendus) + (1 if hasard.random() < attendus - int(attendus) else 0)
        self.file.extend(("piege", None) for _ in range(faux))
        ville.jour_courant["signalements_recus"] += len(nouveaux) + faux
        ville.jour_courant["pieges_recus"] += faux
        traites = self.file[: self.verifications_par_jour]
        self.file = self.file[self.verifications_par_jour :]
        for nature, depotoir in traites:
            if nature == "vrai":
                depotoir.verifie = True
                continue
            if hasard.random() < p["mairie"]["detection_pieges"]:
                ville.jour_courant["pieges_detectes"] += 1
            else:
                ville.jour_courant["pieges_passes"] += 1
                ville.jour_courant["tonnes_perdues_pieges"] += p["mairie"]["tonnes_perdues_par_piege"]
        ville.jour_courant["signalements_en_attente"] = len(self.file)


def position_dans_disque(hasard, centre: tuple[float, float], rayon_m: float, decaler) -> tuple[float, float]:
    angle = hasard.random() * 2 * math.pi
    distance = rayon_m * math.sqrt(hasard.random())
    return decaler(centre, math.cos(angle) * distance, math.sin(angle) * distance)
