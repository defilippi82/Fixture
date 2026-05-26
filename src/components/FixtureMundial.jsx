import React, { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { Card, Row, Col, Form, Table, Badge, Alert, Button, Tabs, Tab } from "react-bootstrap"; 
import { collection, getDocs, query, where } from "firebase/firestore";
import { db} from "../firebaseConfig/firebase"; 
import "../css/FixtureMundial.css";
import { UserContext } from "./context/UserContext.jsx";
import { fixtureConLimite } from "./fixtureData"; 
import { fixtureFase2ConLimite } from "./fixtureData2"; 
import { calcularPuntos } from "./puntosService";
import { guardarPrediccion, escucharRanking } from "./prodeService";
import Swal from "sweetalert2";
import { banderas } from "./banderas"; // Mapa de nombres de países a URLs de banderas

// Combinamos ambos arreglos de datos para el filtrado dinámico en la UI
const todosLosPartidos = [...fixtureConLimite, ...fixtureFase2ConLimite];

export const FixtureMundial = () => {
  const { userData, empresaData, logout } = useContext(UserContext); // Traemos la info de la empresa del contexto global
  const [predicciones, setPredicciones] = useState({});
  const [ranking, setRanking] = useState([]);
  const [resultadosReales, setResultadosReales] = useState({}); 
  const [faseActiva, setFaseActiva] = useState("grupos");
  const [criterioOrden, setCriterioOrden] = useState("fecha"); // Estado para manejar el ordenamiento ("fecha" o "grupo")
  const navigate = useNavigate();
  
  // Cálculo dinámico del pozo total basado en la cantidad de participantes reales
  const montoPorPersona = empresaData?.montoPorParticipante || 0;
  const pozoCalculado = montoPorPersona * ranking.length;

  useEffect(() => {
    console.log("Datos corporativos en el fixture:", { userData, empresaData });
  }, [userData, empresaData]);

  // 1. ESCUCHAR RANKING FILTRADO Y CARGAR PREDICCIONES POR TENANT
  useEffect(() => {
    if (!userData?.empresaId) return;

    // Escuchar Ranking exclusivo de la empresa del usuario logueado
    const unsubscribe = escucharRanking(userData.empresaId, (datos) => {
      const agrupados = {};
      datos.forEach((item) => {
        if (!agrupados[item.legajo]) {
          agrupados[item.legajo] = { usuario: item.usuario, legajo: item.legajo, puntos: 0 };
        }
        agrupados[item.legajo].puntos += item.puntos || 0;
      });
      const rankingFinal = Object.values(agrupados).sort((a, b) => b.puntos - a.puntos);
      setRanking(rankingFinal);
    });

    // Cargar Predicciones del Usuario filtrando por legajo y empresaId
    const cargarMisPredicciones = async () => {
      if (!userData?.legajo || !userData?.empresaId) return;
      try {
        const q = query(
          collection(db, "mundial_predicciones"), 
          where("legajo", "==", userData.legajo),
          where("empresaId", "==", userData.empresaId) // Doble chequeo de seguridad multitenant
        );
        const querySnapshot = await getDocs(q);
        const misPredicciones = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          misPredicciones[data.partidoId] = {
            predLocal: data.golesLocalPrediccion,
            predVisitante: data.golesVisitantePrediccion
          };
        });
        setPredicciones(misPredicciones);
      } catch (error) {
        console.error("Error al cargar predicciones de la empresa:", error);
      }
    };

    cargarMisPredicciones();
    obtenerResultadosAPI();

    return () => unsubscribe();
  }, [userData]);

  // 2. ACTUALIZACIÓN DE RESULTADOS POR API
  const obtenerResultadosAPI = async () => {
    try {
      const res = await fetch("https://raw.githubusercontent.com/openfootball/world-cup/master/2026/cup.json");
      const data = await res.json();
      
      const resultadosAPI = {};
      if (data.rounds) {
        data.rounds.forEach((round) => {
          round.matches.forEach((match) => {
            resultadosAPI[match.team1] = {
              golesLocal: match.score ? match.score[0] : null,
              golesVisitante: match.score ? match.score[1] : null,
              estado: match.score ? "Finalizado" : "Programado"
            };
          });
        });
      }
      setResultadosReales(resultadosAPI);
    } catch (error) {
      console.warn("No se pudo conectar a la API de resultados, usando datos locales.");
    }
  };

  // 3. LÓGICA DE CANDADO DE TIEMPO
  const comprobacionBloqueo = (fechaLimite) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    
    const limite = new Date(`${fechaLimite}T00:00:00`);
    return hoy > limite; 
  };

  const formatearFechaTexto = (fechaStr) => {
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    const fecha = new Date(`${fechaStr}T00:00:00`);
    return fecha.toLocaleDateString('es-AR', opciones);
  };

  const handleChange = (partidoId, campo, valor) => {
    setPredicciones((prev) => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [campo]: valor === "" ? "" : parseInt(valor),
      },
    }));
  };

  const guardar = async (partido) => {
    if (!userData || !userData.legajo || !userData.empresaId) {
        Swal.fire("Error", "No se detectó tu sesión corporativa. Por favor, reingresá.", "error");
        return;
    }
    if (comprobacionBloqueo(partido.fechaLimite)) {
      Swal.fire("Error", "El tiempo para pronosticar este partido ya finalizó.", "error");
      return;
    }

    const pred = predicciones[partido.id];
    if (!pred || pred.predLocal === undefined || pred.predVisitante === undefined || pred.predLocal === "" || pred.predVisitante === "") {
      Swal.fire("Atención", "Completá ambos resultados antes de guardar.", "warning");
      return;
    }

    const puntos = calcularPuntos(
      partido.golesLocal,
      partido.golesVisitante,
      pred.predLocal,
      pred.predVisitante
    );

    // Guardamos incluyendo el ID del tenant correspondiente
    await guardarPrediccion(
      userData.legajo,
      userData.nombre || userData.email,
      userData.empresaId, // Enviamos el ID de la empresa
      partido.id,
      pred.predLocal,
      pred.predVisitante,
      puntos
    );

    Swal.fire({ title: "Guardado", text: "Predicción registrada con éxito", icon: "success", timer: 1500, showConfirmButton: false });
  };

  const cerrarSesion = async () => {
    try {
      await logout(); // Esto ejecuta el signOut(auth) de tu UserContext
      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="fixture-container">
      <div className="alert alert-info text-center shadow-sm" role="alert">
        <h1 className="fixture-title">🌎 Prode {empresaData?.nombre || "Corporate"} - Mundial 2026 🏆</h1>
      </div>

      {/* --- SOLAPAS DE FASES ACTUALIZADAS --- */}
      <Tabs
        activeKey={faseActiva}
        onSelect={(k) => setFaseActiva(k)}
        className="mb-4 custom-tabs justify-content-center"
      >
        <Tab eventKey="grupos" title="Grupos" />
        <Tab eventKey="dieciseisavos" title="Dieciseisavos" />
        <Tab eventKey="octavos" title="Octavos" />
        <Tab eventKey="cuartos" title="Cuartos" />
        <Tab eventKey="semis" title="Semis" />
        <Tab eventKey="finales" title="Finales" />
      </Tabs>

      {/* Layout principal */}
      <div className="prode-layout">
        
        {/* Sección Partidos */}
        <div className="fixture-grid">
          

          {/* Grilla React-Bootstrap estructurada en 3 columnas en pantallas grandes (lg=4) */}
          <Row className="g-3">
            {todosLosPartidos
              .filter((partido) => {
                if (faseActiva === "grupos") return !partido.fase; 
                if (faseActiva === "semis") {
                  return partido.fase === "semis" && (partido.id === 101 || partido.id === 102);
                }
                if (faseActiva === "finales") {
                  return partido.fase === "semis" && (partido.id === 103 || partido.id === 104);
                }
                return partido.fase === faseActiva;
              })
              .sort((a, b) => {
                if (criterioOrden === "grupo" && faseActiva === "grupos") {
                  const grupoA = a.grupo || "";
                  const grupoB = b.grupo || "";
                  // Si pertenecen al mismo grupo, ordena por fecha de manera secundaria
                  if (grupoA === grupoB) {
                    return a.fechaLimite.localeCompare(b.fechaLimite);
                  }
                  return grupoA.localeCompare(grupoB);
                }
                // Orden por defecto: Fecha Límite / Cronológico
                return a.fechaLimite.localeCompare(b.fechaLimite);
              })
              .map((partido) => {
                const pred = predicciones[partido.id] || {};
                const bloqueado = comprobacionBloqueo(partido.fechaLimite);

                let encabezadoCard = `Grupo ${partido.grupo}`;
                if (partido.fase) {
                  if (partido.id === 103) encabezadoCard = "TERCER PUESTO";
                  else if (partido.id === 104) encabezadoCard = "GRAN FINAL";
                  else encabezadoCard = partido.fase.toUpperCase();
                }

                return (
                  <Col xs={12} md={6} lg={4} key={partido.id}>
                    <Card className={`match-card h-100 ${bloqueado ? "partido-deshabilitado" : ""}`}>
                      <Card.Body className="p-2 d-flex flex-column justify-content-between">
                        <div>
                          <div className="match-header text-muted">
                            <Badge bg="success"><span>{encabezadoCard}</span></Badge>
                            <Badge bg="info" text="dark"><span>📅 {partido.fecha}</span></Badge>
                          </div>

                          <div className="mt-2">
                            {bloqueado ? (
                              <Alert variant="danger" className="py-1 px-2 text-center small fw-bold m-0">
                                🚫 Cerrado
                              </Alert>
                            ) : (
                              <Alert variant="warning" className="py-1 px-2 text-center small m-0 text-dark">
                                ⏳ Hasta: <strong>{formatearFechaTexto(partido.fechaLimite)}</strong>
                              </Alert>
                            )}
                          </div>

                          <div className="teams-container mt-2">
                            <div className="team-box">
                              <img src={banderas[partido.local]} alt={partido.local} className="flag-icon" />
                              <span className="fs-6">{partido.local}</span>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={bloqueado}
                                value={pred.predLocal ?? ""}
                                onChange={(e) => handleChange(partido.id, "predLocal", e.target.value)}
                                className="text-center fw-bold"
                              />
                            </div>

                            <div className="vs text-muted">VS</div>

                            <div className="team-box">
                              <img src={banderas[partido.visitante]} alt={partido.visitante} className="flag-icon" />
                              <span className="fs-6">{partido.visitante}</span>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={bloqueado}
                                value={pred.predVisitante ?? ""}
                                onChange={(e) => handleChange(partido.id, "predVisitante", e.target.value)}
                                className="text-center fw-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="text-center mt-3">
                          <button
                            className={`btn btn-sm fw-bold px-3 w-100 ${bloqueado ? "btn-secondary" : "btn-success"}`}
                            disabled={bloqueado}
                            onClick={() => guardar(partido)}
                          >
                            {bloqueado ? "Cerrado" : "Guardar"}
                          </button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
          </Row>
        </div>

        {/* Sección Ranking (Fija a la derecha) */}
        <aside className="ranking-section">
          <div className="ranking-sticky">
            <Button
              variant="outline-info"
              className="w-100 mb-3"
              onClick={cerrarSesion}>Cerrar Sesión </Button>
          {/* Botonera de Filtros de Ordenamiento */}
          <div className="d-flex justify-content-end mb-3 gap-2 bg-light p-2 rounded shadow-sm">
            <span className="me-auto align-self-center text-muted small fw-bold ps-1">
              🏃‍♂️ Participantes Activos: {ranking.length}
            </span>
            <Button 
              variant={criterioOrden === "fecha" ? "success" : "outline-secondary"} 
              size="sm" 
              className="fw-bold"
              onClick={() => setCriterioOrden("fecha")}
            >
              📅 Ordenar por Fecha
            </Button>
            <Button 
              variant={criterioOrden === "grupo" ? "success" : "outline-secondary"} 
              size="sm" 
              className="fw-bold"
              disabled={faseActiva !== "grupos"} // Deshabilitar si no estamos en fase de grupos
              onClick={() => setCriterioOrden("grupo")}
            >
              🔤 Ordenar por Grupo
            </Button>
          </div>
            
            {/* TABLA DE PREMIOS DINÁMICA */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-success text-white text-center py-2">
                <h5 className="m-0 fw-bold">💰 Pozo Corporativo Estimado</h5>
                <h4 className="m-0 fw-bold mt-1">${pozoCalculado.toLocaleString('es-AR')}</h4>
              </Card.Header>
              <Card.Body className="p-0">
                <Table hover className="m-0 align-middle text-center small">
                  <thead className="table-light">
                    <tr>
                      <th>Puesto</th>
                      <th>%</th>
                      <th className="text-end px-3">Premio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-bold">🥇 1° Premio</td>
                      <td>70%</td>
                      <td className="text-end fw-bold text-success px-3">${(pozoCalculado * 0.7).toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                      <td>🥈 2° Premio</td>
                      <td>20%</td>
                      <td className="text-end fw-bold px-3">${(pozoCalculado * 0.2).toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                      <td>🥉 3° Premio</td>
                      <td>10%</td>
                      <td className="text-end fw-bold px-3">${(pozoCalculado * 0.1).toLocaleString('es-AR')}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* TABLA DE RANKING INTERNO */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-dark text-white text-center py-2">
                <h5 className="m-0 fw-bold">🏆 Posiciones en {empresaData?.nombre || "la Empresa"}</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table hover responsive className="m-0 align-middle text-center small">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th className="text-start">Colaborador</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((user, index) => (
                      <tr key={index} className={index === 0 ? "table-warning" : ""}>
                        <td>{index === 0 ? "🥇" : index + 1}</td>
                        <td className="text-start">{user.usuario} <span className="text-muted small">(Leg. {user.legajo})</span></td>
                        <td><Badge bg="primary">{user.puntos}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* SECCIÓN DE REGLAS */}
            <Card className="shadow-sm border-0 bg-light">
              <Card.Header className="bg-secondary text-white text-center py-2">
                <h5 className="m-0 fw-bold">📋 Reglas del Prode</h5>
              </Card.Header>
              <Card.Body className="p-3 text-dark style={{ fontSize: '0.85rem' }}">
                <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                  <li>
                    ⏳ <strong className="text-danger">Tiempo límite:</strong> Se pueden cargar o modificar pronósticos hasta <strong>1 día antes</strong> de que comience cada partido. Cumplido el plazo, el sistema bloqueará los casilleros.
                  </li>
                  <hr className="my-1 border-secondary-subtle" />
                  <li>
                    🎯 <strong>Sistema de Puntuación:</strong>
                    <div className="ps-3 mt-1">
                      • <Badge bg="success">4 Puntos</Badge> <strong>Acierto Exacto:</strong> Pegarle al resultado idéntico (Pleno).<br />
                      • <Badge bg="primary">2 Puntos</Badge> <strong>Tendencia:</strong> Acertar el equipo ganador o el empate básico.<br />
                      • <Badge bg="info" text="dark">+1 Punto Extra</Badge> <strong>Diferencia:</strong> Acertar la diferencia exacta de goles sin embocar el resultado numérico.<br />
                      • <Badge bg="danger">0 Puntos</Badge> No acertar ninguna de las anteriores.
                    </div>
                  </li>
                </ul>
              </Card.Body>
            </Card>
            {userData?.rol === "admin" && (
              <div className="text-center mb-3 mt-3">
                <Link to="/admin-dashboard" className="btn btn-outline-danger btn-sm fw-bold shadow-sm w-100">
                  ⚙️ Panel de Control Corporativo
                </Link>
              </div>
            )}

          </div>
        </aside>

      </div>
    </div>
  );
};