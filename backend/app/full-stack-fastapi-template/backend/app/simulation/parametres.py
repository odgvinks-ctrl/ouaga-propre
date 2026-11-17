import copy
from pathlib import Path

import yaml

FICHIER = Path(__file__).with_name("parametres.yaml")

CORRESPONDANCES = {
    "menages": ("population", "menages", int, 1000, 300000),
    "tauxAbonnement": ("population", "taux_abonnement", float, 0, 100),
    "preCollecteurs": ("pre_collecte", "pre_collecteurs", int, 0, 2000),
    "frequencePassage": ("pre_collecte", "frequence_passage_jours", int, 1, 14),
    "camions": ("transport", "camions", int, 0, 200),
    "camionsEnPanne": ("transport", "camions_en_panne", int, 0, 200),
    "rotations": ("transport", "rotations_par_jour", int, 1, 6),
    "agentsBrigade": ("brigade_laabal", "agents", int, 0, 2000),
    "tauxPieges": ("mairie", "taux_pieges", float, 0, 90),
    "budgetMensuel": ("mairie", "budget_mensuel_fcfa", int, 0, 10_000_000_000),
    "saisonPluies": ("saison_pluies", "active", bool, None, None),
    "nouveauQuartier": ("simulation", "nouveau_quartier", bool, None, None),
    "dureeJours": ("simulation", "duree_jours", int, 7, 90),
}


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
        if minimum is not None:
            valeur = max(minimum, min(maximum, valeur))
        p[section][champ] = valeur
    p["transport"]["camions_en_panne"] = min(p["transport"]["camions_en_panne"], p["transport"]["camions"])
    return p
