import React, { useEffect, useContext, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";
// Tus otros imports...
import { db, auth, messaging } from './firebaseConfig/firebase'; // 👈 Agregalo acá

// --- LIBRERÍA DE TUTORIAL ---
import {Joyride} from 'react-joyride';

// --- CONTEXTO GLOBAL ---
import { UserProvider, UserContext } from './components/context/UserContext.jsx';

// --- COMPONENTES DE VISTA COMUNES ---

import { Footer } from './components/Views/Footer';
import { Login } from "./components/Login.jsx";
import { Privacidad } from "./components/Views/Privacidad";

// --- COMPONENTES CORE DEL FIXTURE ---
import { FixtureMundial } from "./components/FixtureMundial.jsx";
//import { ReglasProde } from "./components/ReglasProde.jsx";

// --- COMPONENTES DE ADMINISTRACIÓN (Empresas y SuperAdmin) ---
import { AdminEmpresaDashboard } from "./components/Admin/AdminEmpresaDashboard.jsx";
//import { RegistrarColaborador } from "./components/Admin/RegistrarColaborador.jsx";
//import { GodPanel } from './components/Admin/GodPanel.jsx'; // Panel de control total

// --- ESTILOS ---
import './css/App.css';

const AppContent = () => {
  const { userData, setUserData, loading } = useContext(UserContext);
  
  // --- ESTADO Y PASOS DEL TUTORIAL ADAPTADO AL PRODE ---
  const [runTutorial, setRunTutorial] = useState(false);

  const [steps] = useState([
    {
      target: '.navbar',
      content: '¡Bienvenido al Prode Mundial de tu Empresa! Esta es tu barra de navegación principal.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.fixture-title',
      content: 'Aquí podrás ver el nombre de tu compañía y personalizar los resultados del mundial.',
    },
    {
      target: '.custom-tabs',
      content: 'Navegá por las pestañas para cargar tus predicciones desde la Fase de Grupos hasta la Gran Final.',
    },
    {
      target: '.match-card:first-child',
      content: 'Colocá los goles estimados en los casilleros. ¡Recordá darle clic al botón "Guardar" antes de que se cumpla el plazo de cierre!',
    },
    {
      target: '.ranking-section',
      content: 'En esta sección verás el pozo de premios de la empresa y las posiciones en tiempo real con tus compañeros.',
    },
    {
      target: '.btn-guia-ayuda',
      content: '¿Tenés dudas de cómo sumar puntos? Usá este botón para repetir este tutorial interactivo cuando quieras.',
    }
  ]);

  // Mostrar el tutorial únicamente la primera vez que ingresa el usuario
  useEffect(() => {
    const hasSeen = localStorage.getItem('prode_corporate_tutorial_visto');
    if (!hasSeen && userData) {
      setRunTutorial(true);
    }
  }, [userData]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem('prode_corporate_tutorial_visto', 'true');
      setRunTutorial(false);
    }
  };

  // --- LÓGICA DE FIREBASE MESSAGING (Notificaciones de partidos por empezar o alertas de administración) ---
  const guardarTokenEnBaseDeDatos = async (token) => {
    const db = getFirestore();
    const usuario = auth.currentUser;
    if (usuario) {
      const usuarioRef = doc(db, 'usuarios', usuario.uid);
      try {
        await setDoc(usuarioRef, { fcmToken: token }, { merge: true });
      } catch (error) {
        console.error('Error al guardar token FCM corporativo:', error);
      }
    }
  };

  const solicitarPermiso = async () => {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'BC1dFTH3QJeInZ8LL-2ZrBj6EXE8iWmDu7PDfDGhx7LiADYJ_KjzZdK-izhIaPOpmI2qQ0cveH_fl5orZ1znFTw' 
        });
        guardarTokenEnBaseDeDatos(token);
      }
    } catch (error) {
      console.error('Error en permisos de notificación:', error);
    }
  };

  useEffect(() => {
    if (userData) {
      solicitarPermiso();
      const unsubscribe = onMessage(messaging, (payload) => {
        // Alerta nativa simple al recibir un mensaje push en primer plano
        alert(`${payload.notification.title}: ${payload.notification.body}`);
      });
      return () => unsubscribe();
    }
  }, [userData]);

  const handleLogout = () => {
    localStorage.removeItem('userData');
    setUserData(null);
  };

  if (loading) return null;

  return (
    <Router>
      <div className="App container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0rem auto' }}>
        
        {/* COMPONENTE INTERACTIVO DE GUÍA */}
        <Joyride
          steps={steps}
          run={runTutorial}
          continuous={true}
          showSkipButton={true}
          showProgress={true}
          callback={handleJoyrideCallback}
          locale={{
            back: 'Atrás',
            close: 'Cerrar',
            last: 'Finalizar',
            next: 'Siguiente',
            skip: 'Saltar guía'
          }}
          styles={{
            options: {
              primaryColor: '#198754', // Cambiado a verde corporativo de éxito
              zIndex: 10000,
            }
          }}
        />

        

        <main style={{ marginBottom: '100px', marginTop: '80px', flex: '1 0 auto' }}>
          <Routes>
            {/* Control de Acceso / Login */}
            <Route path="/" element={userData ? <Login /> : <Navigate to="/fixture" />} />
            <Route path="/login" element={!userData ? <Login /> : <Navigate to="/fixture" />} />

            {/* Rutas Protegidas del Colaborador */}
            <Route path="/fixture" element={userData ? <FixtureMundial /> : <Navigate to="/login" />} />
            {/*<Route path="/reglas" element={userData ? <ReglasProde /> : <Navigate to="/login" />} />*/}
            <Route path="/privacidad" element={userData ? <Privacidad /> : <Navigate to="/login" />} />

            {/* Rutas Protegidas de Administración de la Empresa (Manager/RRHH) */}
            <Route path="/admin-dashboard" element={userData && userData.rol === "admin" ? <AdminEmpresaDashboard /> : <Navigate to="/login" />} />
            {/*<Route path="/colaboradores/create" element={userData && userData.rol === "admin" ? <RegistrarColaborador /> : <Navigate to="/login" />} />*/}

            
            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export const App = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};