# Donnees OpenStreetMap

Ce dossier est reserve aux extraits geographiques OSM utilises pour les cartes et analyses de Ouagadougou. Il ne contient pas encore d'extrait source : aucun fichier PBF/GeoJSON officiel n'est fourni dans le depot.

## Fichiers attendus

- Un extrait PBF ou GeoJSON obtenu depuis une source publique documentee.
- `manifest.json`, qui trace la source, la date d'extraction, la zone couverte, la licence et le checksum du fichier.

Avant d'ajouter un extrait, verifier la licence et les conditions du fournisseur. Les donnees OpenStreetMap sont sous licence ODbL; attribuer OpenStreetMap et ses contributeurs dans toute publication ou produit qui utilise les donnees. Ne jamais presenter l'extrait comme une source administrative officielle.

Le manifeste `manifest.json` est un modele a completer. Ses champs `null` indiquent qu'aucune source ni extraction n'a encore ete validee.