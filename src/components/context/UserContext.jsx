import React, { createContext, useState, useEffect } from "react";
import { auth, db} from "../../firebaseConfig/firebase";
import { onAuthStateChanged, signOut} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Datos de Firestore (legajo, empresaId, etc)
  const [empresaData, setEmpresaData] = useState(null); // Datos de la empresa actual
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // 1. Obtener datos del usuario desde Firestore
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          setUserData(uData);

          // 2. Obtener datos de su empresa
          if (uData.empresaId) {
            const empresaDocRef = doc(db, "empresas", uData.empresaId);
            const empresaSnap = await getDoc(empresaDocRef);
            if (empresaSnap.exists()) {
              setEmpresaData(empresaSnap.data());
            }
          }
        }
      } else {
        setUser(null);
        setUserData(null);
        setEmpresaData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <UserContext.Provider value={{ user, userData, empresaData, loading, logout }}>
      {!loading && children}
    </UserContext.Provider>
  );
};