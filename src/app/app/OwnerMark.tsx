"use client";
import { useEffect } from "react";

// Marks this phone or computer as the business owner's, so opening a client link here never counts as the client opening it.
export default function OwnerMark() {
  useEffect(() => {
    try { localStorage.setItem("yebo_owner", "1"); } catch { /* storage blocked */ }
  }, []);
  return null;
}
