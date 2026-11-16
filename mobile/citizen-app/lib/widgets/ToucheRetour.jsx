import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { accueils, parent } from "./navigation.js";

export default function ToucheRetour() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const chemin = useRef(pathname);

  useEffect(() => {
    chemin.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const ecoute = App.addListener("backButton", () => {
      const actuel = chemin.current;
      if (accueils.includes(actuel)) {
        App.minimizeApp();
        return;
      }
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate(parent(actuel), { replace: true });
    });
    return () => {
      ecoute.then((e) => e.remove());
    };
  }, [navigate]);

  return null;
}
