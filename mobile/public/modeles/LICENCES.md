# Modèles de détection embarqués

| Fichier | Rôle | Source | Licence |
| --- | --- | --- | --- |
| `visages.onnx` | Détection des visages (Ultra-Light-Fast-Generic-Face-Detector, version RFB-640) | https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB | MIT |
| `plaques.onnx` | Détection des plaques d'immatriculation (YOLOv9-t 384, end2end) | https://github.com/ankandrew/open-image-models | MIT |

Les deux modèles tournent sur le téléphone avec onnxruntime-web : la photo est floutée avant de quitter l'appareil.
