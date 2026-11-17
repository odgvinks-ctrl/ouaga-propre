import argparse
import json
import sys
import time

from .modele import simuler


def main() -> None:
    lecteur = argparse.ArgumentParser(description="Simulateur multi-agents FASO NEERE")
    lecteur.add_argument("--parametres", help="fichier JSON de changements, ex. {\"camionsEnPanne\": 2}")
    lecteur.add_argument("--sortie", default="-", help="fichier de résultats (par défaut : écran)")
    arguments = lecteur.parse_args()
    changements = json.load(open(arguments.parametres, encoding="utf-8")) if arguments.parametres else {}
    debut = time.time()
    resultat = simuler(changements)
    texte = json.dumps(resultat, ensure_ascii=False, indent=2)
    if arguments.sortie == "-":
        sys.stdout.write(texte)
    else:
        open(arguments.sortie, "w", encoding="utf-8").write(texte)
    resume = resultat["resume"]
    print(
        f"\n{resume['tauxCollecte']} % collectés, {resume['depotoirsFinal']} dépotoirs au dernier jour, calcul en {time.time() - debut:.1f} s",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
