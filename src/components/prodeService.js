import { db } from "../firebaseConfig/firebase";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";

// 1. Guardar con Tenant ID
export const guardarPrediccion = async (legajo, usuario, empresaId, partidoId, golesLocal, golesVisitante, puntos) => {
  await addDoc(collection(db, "mundial_predicciones"), {
    legajo,
    usuario,
    empresaId, // <-- Guardamos la pertenencia corporativa
    partidoId,
    golesLocalPrediccion: golesLocal,
    golesVisitantePrediccion: golesVisitante,
    puntos,
    fechaRegistro: new Date()
  });
};

// 2. Escuchar Ranking segmentado
export const escucharRanking = (empresaId, callback) => {
  const q = query(
    collection(db, "mundial_predicciones"), 
    where("empresaId", "==", empresaId) // <-- Filtro estricto multitenant
  );
  
  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map(doc => doc.data());
    callback(datos);
  });
};