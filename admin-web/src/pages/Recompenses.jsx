import { useState } from "react";
import { Send, Ban } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerEchanges, changerStatutEchange } from "../services/recompenses.js";
import { statutsEchange } from "@modeles/recompenses.js";
import { dateHeure } from "@donnees/format.js";
import Badge from "../components/Badge.jsx";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";

const onglets = [
  { cle: "en_attente", label: "À envoyer" },
  { cle: "envoye", label: "Envoyés" },
  { cle: "refuse", label: "Refusés" },
];

export default function Recompenses() {
  const [echanges, setEchanges] = useState([]);
  const [onglet, setOnglet] = useState("en_attente");
  const [refus, setRefus] = useState(null);
  const [erreur, setErreur] = useState("");

  async function charger() {
    setEchanges(await listerEchanges());
  }

  useActualisation(charger, "echanges");

  async function changer(id, statut) {
    try {
      await changerStatutEchange(id, statut);
      setRefus(null);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const visibles = echanges.filter((e) => e.statut === onglet);
  const distribues = echanges.filter((e) => e.statut === "envoye").reduce((t, e) => t + e.cout, 0);

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Récompenses</h1>
          <p className="page-sous-titre">
            Les citoyens échangent les points gagnés en signalant. Contrôlez chaque demande avant d'envoyer les unités, l'internet, les SMS ou d'activer le bon.
          </p>
        </div>
      </div>

      <div className="indicateurs">
        <div className={echanges.some((e) => e.statut === "en_attente") ? "indicateur attente" : "indicateur"}>
          <strong>{echanges.filter((e) => e.statut === "en_attente").length}</strong>
          <span>Demandes à traiter</span>
        </div>
        <div className="indicateur ok">
          <strong>{echanges.filter((e) => e.statut === "envoye").length}</strong>
          <span>Cadeaux envoyés · {distribues} points</span>
        </div>
      </div>

      <div className="filtres">
        {onglets.map((o) => (
          <button key={o.cle} type="button" className={onglet === o.cle ? "actif" : ""} onClick={() => setOnglet(o.cle)}>
            {o.label} · {echanges.filter((e) => e.statut === o.cle).length}
          </button>
        ))}
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}

      {visibles.length === 0 ? (
        <EtatVide titre="Aucune demande" texte={onglet === "en_attente" ? "Les nouvelles demandes d'échange des citoyens apparaîtront ici." : "Aucun échange dans cette catégorie."} />
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Demandé le</th>
                <th>Citoyen</th>
                <th>Cadeau</th>
                <th>Destination</th>
                <th>Historique du citoyen</th>
                <th>{onglet === "en_attente" ? "Actions" : "Statut"}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => (
                <tr key={e.id}>
                  <td>{dateHeure(e.date)}</td>
                  <td className="cellule-principale">
                    <strong>{e.citoyenNom}</strong>
                    <small>{e.citoyenTelephone}</small>
                  </td>
                  <td className="cellule-principale">
                    <strong>{e.label}</strong>
                    <small>{e.cout} points</small>
                  </td>
                  <td>{e.code ? `Bon ${e.code}` : `${e.operateur} · ${e.numero}`}</td>
                  <td>
                    {e.valides} validé(s)
                    {e.rejetes > 0 && <span className="badge statut-refus" style={{ marginLeft: 6 }}>{e.rejetes} rejeté(s)</span>}
                  </td>
                  <td>
                    {onglet === "en_attente" ? (
                      <div className="page-actions">
                        <button type="button" className="btn btn-primaire btn-petit" onClick={() => changer(e.id, "envoye")}>
                          <Send size={14} /> {e.code ? "Activer le bon" : "Marquer comme envoyé"}
                        </button>
                        <button type="button" className="btn btn-danger btn-petit" onClick={() => setRefus(e)}>
                          <Ban size={14} /> Refuser
                        </button>
                      </div>
                    ) : (
                      <Badge statut={e.statut} liste={statutsEchange} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refus && (
        <Dialogue titre={`Refuser l'échange de ${refus.citoyenNom} ?`} onFermer={() => setRefus(null)}>
          <p className="page-sous-titre">Les {refus.cout} points seront rendus au citoyen. Refusez par exemple si ses signalements paraissent frauduleux.</p>
          <div className="dialogue-actions">
            <button type="button" className="btn btn-secondaire" onClick={() => setRefus(null)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger-plein" onClick={() => changer(refus.id, "refuse")}>
              Refuser et rendre les points
            </button>
          </div>
        </Dialogue>
      )}
    </section>
  );
}
