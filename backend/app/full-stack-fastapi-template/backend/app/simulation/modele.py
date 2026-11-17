import math
import random
from collections import defaultdict

from app.optimization.geo import decaler, distance_m
from app.optimization.points import nombre_de_points, placer_points
from app.optimization.tournees import planifier_tournees

from .agents import (
    BrigadeLaabal,
    Camion,
    Depotoir,
    Mairie,
    Menage,
    PointRegroupement,
    PreCollecteur,
    position_dans_disque,
)
from .parametres import appliquer, valeurs_formulaire

COMPTEURS = [
    "production_t",
    "precollecte_t",
    "evacue_t",
    "jete_t",
    "autre_filiere_t",
    "nettoye_t",
    "capacite_camions_t",
    "signalements_recus",
    "pieges_recus",
    "pieges_detectes",
    "pieges_passes",
    "tonnes_perdues_pieges",
    "nouveaux_depotoirs",
    "signalements_en_attente",
]


class Ville:
    def __init__(self, parametres: dict):
        self.p = parametres
        self.hasard = random.Random(parametres["simulation"]["graine"])
        pluie = parametres["saison_pluies"]
        actif = pluie["active"]
        self.facteur_production = 1 + (pluie["hausse_production"] if actif else 0)
        self.facteur_tricycles = 1 - (pluie["baisse_vitesse_tricycles"] if actif else 0)
        self.facteur_camions = 1 - (pluie["baisse_capacite_camions"] if actif else 0)
        self.facteur_brigade = 1 - (pluie["baisse_efficacite_brigade"] if actif else 0)
        self.depotoirs: list[Depotoir] = []
        self.delais: list[int] = []
        self.jour_courant: dict = {}
        self.servis_du_jour: set[int] = set()
        self._creer_quartiers()
        self._creer_menages()
        self._planifier()
        self._creer_acteurs()

    def _creer_quartiers(self) -> None:
        zone = self.p["zone"]
        total = self.p["population"]["menages"]
        self.quartiers = []
        for q in zone["quartiers"]:
            self.quartiers.append({**q, "menages": round(total * q["part"]), "nouveau": False})
        if self.p["simulation"]["nouveau_quartier"]:
            self.quartiers.append({**zone["nouveau_quartier"], "nouveau": True})
        self.depot = (zone["centre_traitement"]["lat"], zone["centre_traitement"]["lng"])

    def _creer_menages(self) -> None:
        taille = self.p["population"]["menages_par_agent"]
        taux = self.p["population"]["taux_abonnement"] / 100
        self.menages: list[Menage] = []
        self.menages_par_quartier: dict[str, list[Menage]] = defaultdict(list)
        numero = 0
        for q in self.quartiers:
            restants = q["menages"]
            centre = (q["lat"], q["lng"])
            while restants > 0:
                nombre = min(taille, restants)
                restants -= nombre
                position = position_dans_disque(self.hasard, centre, q["rayon_m"], decaler)
                abonne = (not q["nouveau"]) and self.hasard.random() < taux
                menage = Menage(numero, q["nom"], position, nombre, abonne)
                menage.jours_sans_passage = self.hasard.randrange(self.p["pre_collecte"]["frequence_passage_jours"])
                self.menages.append(menage)
                self.menages_par_quartier[q["nom"]].append(menage)
                numero += 1

    def _planifier(self) -> None:
        p = self.p
        self.points: dict[str, PointRegroupement] = {}
        kg = p["population"]["kg_par_menage_jour"] * self.facteur_production
        for q in self.quartiers:
            menages = self.menages_par_quartier[q["nom"]]
            nombre = nombre_de_points(q["menages"], p["points_regroupement"]["menages_par_point"])
            centres = placer_points(
                [m.position for m in menages],
                [m.nombre for m in menages],
                nombre,
                graine=p["simulation"]["graine"],
            )
            for indice, centre in enumerate(centres, start=1):
                identifiant = f"{q['nom']}-{indice}"
                self.points[identifiant] = PointRegroupement(
                    identifiant, q["nom"], centre, p["points_regroupement"]["capacite_t"], propose=q["nouveau"]
                )
            for menage in menages:
                proche = min(
                    (pt for pt in self.points.values() if pt.quartier == q["nom"]),
                    key=lambda pt: distance_m(menage.position, pt.position),
                )
                menage.point = proche.id
        charges = defaultdict(float)
        for menage in self.menages:
            if menage.abonne:
                charges[menage.point] += menage.nombre * kg / 1000
        actifs = max(0, p["transport"]["camions"] - p["transport"]["camions_en_panne"])
        capacite = p["transport"]["capacite_camion_t"] * p["transport"]["rotations_par_jour"] * self.facteur_camions
        a_desservir = [
            {"id": pt.id, "position": pt.position, "charge_t": round(charges[pt.id], 3)}
            for pt in self.points.values()
            if charges[pt.id] > 0
        ]
        self.plan = planifier_tournees(self.depot, a_desservir, actifs, capacite)
        self.charges = charges

    def _creer_acteurs(self) -> None:
        p = self.p
        abonnes_par_quartier = defaultdict(int)
        for menage in self.menages:
            if menage.abonne:
                abonnes_par_quartier[menage.quartier] += menage.nombre
        total_abonnes = sum(abonnes_par_quartier.values()) or 1
        nombre = p["pre_collecte"]["pre_collecteurs"]
        self.pre_collecteurs = []
        restes = []
        for quartier, abonnes in abonnes_par_quartier.items():
            part = nombre * abonnes / total_abonnes
            entier = int(part)
            restes.append((part - entier, quartier))
            self.pre_collecteurs += [PreCollecteur(len(self.pre_collecteurs) + i, quartier) for i in range(entier)]
        for _, quartier in sorted(restes, reverse=True)[: max(0, nombre - len(self.pre_collecteurs))]:
            self.pre_collecteurs.append(PreCollecteur(len(self.pre_collecteurs), quartier))
        self.camions = []
        tournees = {t["camion"]: t["points"] for t in self.plan["tournees"]}
        for numero in range(1, p["transport"]["camions"] + 1):
            en_panne = numero > p["transport"]["camions"] - p["transport"]["camions_en_panne"]
            self.camions.append(Camion(numero, en_panne, tournees.get(numero, [])))
        self.brigade = BrigadeLaabal(p["brigade_laabal"]["agents"])
        self.mairie = Mairie(p["mairie"]["verifications_par_jour"])

    def jeter(self, quartier: str, position: tuple[float, float], tonnes: float, jour: int) -> None:
        if tonnes <= 0:
            return
        self.jour_courant["jete_t"] += tonnes
        proche = None
        for depotoir in self.depotoirs:
            if depotoir.actif and depotoir.quartier == quartier and distance_m(depotoir.position, position) < 220:
                proche = depotoir
                break
        if proche is None:
            angle = self.hasard.random() * 2 * math.pi
            ecart = 40 + self.hasard.random() * 90
            lieu = decaler(position, math.cos(angle) * ecart, math.sin(angle) * ecart)
            proche = Depotoir(len(self.depotoirs) + 1, quartier, lieu, 0.0, jour)
            self.depotoirs.append(proche)
            self.jour_courant["nouveaux_depotoirs"] += 1
        proche.tonnes += tonnes

    def jour(self, numero: int) -> dict:
        self.jour_courant = dict.fromkeys(COMPTEURS, 0)
        self.servis_du_jour = set()
        for menage in self.menages:
            menage.step(self, numero)
        for pre_collecteur in self.pre_collecteurs:
            pre_collecteur.step(self, numero)
        for camion in self.camions:
            camion.step(self, numero)
        self.mairie.step(self, numero)
        self.brigade.step(self, numero)
        j = self.jour_courant
        actifs = [d for d in self.depotoirs if d.actif]
        production = j["production_t"] or 1
        return {
            "jour": numero,
            "production_t": round(j["production_t"], 2),
            "precollecte_t": round(j["precollecte_t"], 2),
            "evacue_t": round(j["evacue_t"], 2),
            "non_collecte_t": round(j["jete_t"] + j["autre_filiere_t"], 2),
            "taux_collecte": round(min(100, j["precollecte_t"] / production * 100), 1),
            "utilisation_camions": round(j["evacue_t"] / j["capacite_camions_t"] * 100, 1) if j["capacite_camions_t"] else 0,
            "depotoirs_actifs": len(actifs),
            "depotoirs_t": round(sum(d.tonnes for d in actifs), 1),
            "nouveaux_depotoirs": j["nouveaux_depotoirs"],
            "nettoye_t": round(j["nettoye_t"], 2),
            "signalements_recus": j["signalements_recus"],
            "pieges_detectes": j["pieges_detectes"],
            "pieges_passes": j["pieges_passes"],
            "signalements_en_attente": j["signalements_en_attente"],
            "points": {pt.id: round(min(100, pt.contenu_t / pt.capacite_t * 100)) for pt in self.points.values()},
            "carte": [
                [round(d.position[0], 5), round(d.position[1], 5), round(d.tonnes, 2), d.quartier]
                for d in sorted(actifs, key=lambda d: d.tonnes, reverse=True)[:250]
            ],
        }


def _fcfa(valeur: int) -> str:
    return f"{valeur:,}".replace(",", " ")


def _diagnostic(ville: Ville, jours: list[dict]) -> dict:
    p = ville.p
    nb = len(jours)
    def moyenne(cle):
        return sum(j[cle] for j in jours) / nb
    kg = p["population"]["kg_par_menage_jour"] * ville.facteur_production
    abonnes = sum(m.nombre for m in ville.menages if m.abonne)
    production_abonnes = abonnes * kg / 1000
    capacite_precollecte = (
        p["pre_collecte"]["pre_collecteurs"] * p["pre_collecte"]["capacite_tricycle_t"] * p["pre_collecte"]["tours_par_jour"] * ville.facteur_tricycles
    )
    actifs = p["transport"]["camions"] - p["transport"]["camions_en_panne"]
    par_camion = p["transport"]["capacite_camion_t"] * p["transport"]["rotations_par_jour"] * ville.facteur_camions
    capacite_transport = actifs * par_camion
    entree_points = min(production_abonnes, capacite_precollecte)

    goulot = "abonnements"
    if capacite_transport < entree_points * 0.98:
        goulot = "transport"
    elif capacite_precollecte < production_abonnes * 0.98:
        goulot = "pre-collecte"

    recommandations = []
    debordements = sorted((pt for pt in ville.points.values() if pt.deborde_jour is not None and not pt.propose), key=lambda pt: pt.deborde_jour)
    if debordements:
        premier = debordements[0]
        autres = sorted({pt.quartier for pt in debordements[1:4]} - {premier.quartier})
        suite = f", puis à {', '.join(autres)}" if autres else ""
        recommandations.append(f"Dès le jour {premier.deborde_jour}, le point de regroupement {premier.id} déborde{suite}.")
    if goulot == "transport":
        manque = math.ceil((entree_points - capacite_transport) / par_camion) if par_camion else 0
        recommandations.append(f"Le transport bloque la collecte : il manque {max(1, manque)} camion(s) en service pour vider les points.")
    if goulot == "pre-collecte":
        par_tricycle = p["pre_collecte"]["capacite_tricycle_t"] * p["pre_collecte"]["tours_par_jour"] * ville.facteur_tricycles
        manque = math.ceil((production_abonnes - capacite_precollecte) / par_tricycle) if par_tricycle else 0
        recommandations.append(f"Les pré-collecteurs sont saturés : il en manque {max(1, manque)} pour servir tous les abonnés.")
    if ville.plan["non_desservis"]:
        recommandations.append(
            f"{len(ville.plan['non_desservis'])} point(s) de regroupement ne sont dans aucune tournée ({str(round(ville.plan['charge_non_desservie_t'], 1)).replace('.', ',')} t/jour non évacuées)."
        )
    if p["population"]["taux_abonnement"] < 50:
        recommandations.append(
            f"Seuls {round(p['population']['taux_abonnement'])} % des ménages sont abonnés : une campagne d'abonnement réduirait les dépotoirs sauvages."
        )
    nouveau = next((q for q in ville.quartiers if q["nouveau"]), None)
    if nouveau:
        proposes = sum(1 for pt in ville.points.values() if pt.propose)
        recommandations.append(
            f"{nouveau['nom']} : {nouveau['menages']} ménages sans pré-collecte. Le plan propose {proposes} point(s) de regroupement et une structure à installer."
        )
    if p["saison_pluies"]["active"]:
        recommandations.append("Saison des pluies : curer les caniveaux en priorité et ajouter des rotations, les engins sont ralentis.")
    delai = round(sum(ville.delais) / len(ville.delais), 1) if ville.delais else None
    restant = jours[-1]["depotoirs_t"]
    if restant > 5 and (delai is None or delai > 7 or jours[-1]["depotoirs_t"] > jours[0]["depotoirs_t"]):
        rythme = max(0.0, (jours[-1]["depotoirs_t"] - jours[0]["depotoirs_t"]) / max(1, nb - 1))
        besoin = math.ceil(rythme / (p["brigade_laabal"]["tonnes_par_agent_jour"] * ville.facteur_brigade or 1))
        if besoin > 0:
            recommandations.append(f"Les dépotoirs s'accumulent : il faudrait environ {besoin} agent(s) Laabal de plus.")
    pieges_passes = sum(j["pieges_passes"] for j in jours)
    if pieges_passes:
        recommandations.append(f"{pieges_passes} faux signalement(s) ont échappé à la vérification : renforcer le contrôle avant de transmettre.")
    if jours[-1]["signalements_en_attente"] > p["mairie"]["verifications_par_jour"]:
        recommandations.append("La mairie n'arrive pas à vérifier tous les signalements : il faut plus de vérificateurs.")
    cout = 30 * (
        p["transport"]["camions"] * p["transport"]["cout_jour_fcfa"]
        + p["pre_collecte"]["pre_collecteurs"] * p["pre_collecte"]["cout_jour_fcfa"]
        + p["brigade_laabal"]["agents"] * p["brigade_laabal"]["cout_jour_fcfa"]
    )
    budget = p["mairie"]["budget_mensuel_fcfa"]
    if cout > budget:
        recommandations.append(f"Ce scénario coûte {_fcfa(cout)} FCFA par mois, soit {_fcfa(cout - budget)} FCFA de plus que le budget.")

    menages_total = sum(q["menages"] for q in ville.quartiers)
    signalements = sum(j["signalements_recus"] for j in jours)
    return {
        "menagesTotal": menages_total,
        "abonnes": abonnes,
        "production": round(moyenne("production_t"), 1),
        "collecte": round(moyenne("precollecte_t"), 1),
        "nonCollecte": round(moyenne("non_collecte_t"), 1),
        "tauxCollecte": round(moyenne("taux_collecte")),
        "utilisationCamions": round(moyenne("utilisation_camions")),
        "nouveauxDepotoirs": round(sum(j["nouveaux_depotoirs"] for j in jours) * 7 / nb),
        "depotoirsFinal": jours[-1]["depotoirs_actifs"],
        "signalements": round(signalements * 7 / nb),
        "pieges": round(sum(j["pieges_detectes"] + j["pieges_passes"] for j in jours) * 7 / nb),
        "delaiIntervention": delai,
        "goulot": goulot,
        "coutMensuel": cout,
        "budgetMensuel": budget,
        "recommandations": recommandations,
    }


def simuler(changements: dict | None = None) -> dict:
    parametres = appliquer(changements)
    ville = Ville(parametres)
    jours = [ville.jour(numero) for numero in range(1, parametres["simulation"]["duree_jours"] + 1)]
    resume = _diagnostic(ville, jours)
    return {
        "parametres": valeurs_formulaire(parametres),
        "resume": resume,
        "jours": jours,
        "plan": {
            "centre": {"nom": parametres["zone"]["centre_traitement"]["nom"], "position": list(ville.depot)},
            "quartiers": [
                {"nom": q["nom"], "position": [q["lat"], q["lng"]], "rayon_m": q["rayon_m"], "menages": q["menages"], "nouveau": q["nouveau"]}
                for q in ville.quartiers
            ],
            "points": [
                {
                    "id": pt.id,
                    "quartier": pt.quartier,
                    "position": [round(pt.position[0], 6), round(pt.position[1], 6)],
                    "capacite_t": pt.capacite_t,
                    "charge_t": round(ville.charges.get(pt.id, 0), 2),
                    "propose": pt.propose,
                    "deborde_jour": pt.deborde_jour,
                }
                for pt in ville.points.values()
            ],
            **ville.plan,
            "camions_en_panne": parametres["transport"]["camions_en_panne"],
        },
    }
