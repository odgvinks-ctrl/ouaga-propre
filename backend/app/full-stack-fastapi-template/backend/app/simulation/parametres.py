import copy
from pathlib import Path

import yaml

FICHIER = Path(__file__).with_name("parametres.yaml")

CORRESPONDANCES = {
    "menages": ("population", "menages", int, 1000, 800000),
    "tauxAbonnement": ("population", "taux_abonnement", float, 0, 100),
    "preCollecteurs": ("pre_collecte", "pre_collecteurs", int, 0, 5000),
    "frequencePassage": ("pre_collecte", "frequence_passage_jours", int, 1, 14),
    "camions": ("transport", "camions", int, 0, 200),
    "camionsEnPanne": ("transport", "camions_en_panne", int, 0, 200),
    "rotations": ("transport", "rotations_par_jour", int, 1, 6),
    "agentsBrigade": ("brigade_laabal", "agents", int, 0, 5000),
    "tauxPieges": ("mairie", "taux_pieges", float, 0, 90),
    "budgetMensuel": ("mairie", "budget_mensuel_fcfa", int, 0, 10_000_000_000),
    "saisonPluies": ("saison_pluies", "active", bool, None, None),
    "nouveauQuartier": ("simulation", "nouveau_quartier", bool, None, None),
    "dureeJours": ("simulation", "duree_jours", int, 7, 90),
    "zone": ("simulation", "zone", str, None, None),
}

ZONE_DEMO = "demo"
ZONE_VILLE = "ville"


def parametres_par_defaut() -> dict:
    return yaml.safe_load(FICHIER.read_text(encoding="utf-8"))


def valeurs_formulaire(parametres: dict | None = None) -> dict:
    p = parametres or parametres_par_defaut()
    return {cle: p[section][champ] for cle, (section, champ, *_rest) in CORRESPONDANCES.items()}


def appliquer(changements: dict | None) -> dict:
    p = copy.deepcopy(parametres_par_defaut())
    for cle, valeur in (changements or {}).items():
        if cle not in CORRESPONDANCES or valeur is None:
            continue
        section, champ, type_attendu, minimum, maximum = CORRESPONDANCES[cle]
        valeur = bool(valeur) if type_attendu is bool else type_attendu(valeur)
        if cle == "zone" and valeur not in identifiants_zones(p):
            continue
        if minimum is not None:
            valeur = max(minimum, min(maximum, valeur))
        p[section][champ] = valeur
    p["transport"]["camions_en_panne"] = min(p["transport"]["camions_en_panne"], p["transport"]["camions"])
    return p


def identifiants_zones(parametres: dict | None = None) -> list[str]:
    p = parametres or parametres_par_defaut()
    return [ZONE_DEMO, ZONE_VILLE] + [a["id"] for a in p["arrondissements"]]


def menages_zone(parametres: dict, zone: str) -> int:
    if zone == ZONE_DEMO:
        return parametres_par_defaut()["population"]["menages"]
    arrondissements = parametres["arrondissements"]
    if zone != ZONE_VILLE:
        arrondissements = [a for a in arrondissements if a["id"] == zone]
    return round(sum(a["population"] for a in arrondissements) / parametres["taille_menage"])


def zones(parametres: dict | None = None) -> list[dict]:
    p = parametres or parametres_par_defaut()
    defaut = parametres_par_defaut()
    moyens = p["moyens_pour_1000_menages"]
    resultat = []
    for identifiant in identifiants_zones(p):
        if identifiant == ZONE_DEMO:
            nom = defaut["zone"]["nom"]
            valeurs = {k: v for k, v in valeurs_formulaire(defaut).items() if k in ("menages", "preCollecteurs", "camions", "agentsBrigade", "budgetMensuel")}
        else:
            nom = "Ouagadougou, 12 arrondissements" if identifiant == ZONE_VILLE else next(a["nom"] for a in p["arrondissements"] if a["id"] == identifiant)
            menages = menages_zone(p, identifiant)
            milliers = menages / 1000
            valeurs = {
                "menages": menages,
                "preCollecteurs": max(1, round(milliers * moyens["pre_collecteurs"])),
                "camions": max(1, round(milliers * moyens["camions"])),
                "agentsBrigade": max(1, round(milliers * moyens["agents_brigade"])),
                "budgetMensuel": round(milliers * moyens["budget_mensuel_fcfa"], -5),
            }
        resultat.append({"id": identifiant, "nom": nom, "valeurs": valeurs})
    return resultat
