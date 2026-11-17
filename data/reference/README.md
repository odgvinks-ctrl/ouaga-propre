# Donnees de reference FASO NEERE

`jeu_demo_faso_neere.json` est un jeu de demonstration **entierement synthetique** pour tester les parcours citoyens, structures, administration et signalements.

## Contenu

- 7 quartiers de demonstration et communes associees
- 3 citoyens et 3 structures fictifs
- Structures validees et en attente, avec formules de collecte
- Signalements couvrant les principaux statuts backend
- Liens entre auteurs, structures et signalements par identifiants `ref`

Aucun mot de passe, document d'identite, photo ou numero de compte reel n'est inclus. Les positions sont approximatives et ne doivent pas etre traitees comme une source geographique officielle.

## Utilisation

Le fichier est une source de reference JSON, pas un script d'import. Il ne modifie ni PostgreSQL, ni l'application mobile, ni les donnees locales du navigateur. Les identifiants `ref` doivent etre convertis en UUID lors d'un futur import; les champs du jeu ne remplacent pas les modeles SQLModel.

Valider la syntaxe JSON depuis la racine du depot :

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/reference/jeu_demo_faso_neere.json', 'utf8')); console.log('JSON valide')"
```
