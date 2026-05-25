import React, { useContext, useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Tabs, Tab } from "react-bootstrap";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom"; 
import { db } from "../../firebaseConfig/firebase.js";
import { UserContext } from "../context/UserContext.jsx";
import { fixtureConLimite } from "../../components/fixtureData";
import { fixtureFase2ConLimite } from "../../components/fixtureData2";
import Swal from "sweetalert2";

const todosLosPartidos = [...fixtureConLimite, ...fixtureFase2ConLimite];

export const AdminEmpresaDashboard = () => {
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]); 
  const [empresaFiltro, setEmpresaFiltro] = useState(""); 
  
  const [partidosManuales, setPartidosManuales] = useState(todosLosPartidos);
  
  // Estados para Modal de Edición de Usuario
  const [showEditModal, setShowEditModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  // ==========================================
  // 1. VALIDACIÓN SUPER ADMIN EXCLUSIVA
  // ==========================================
  useEffect(() => {
    // Si ya cargó la data del usuario y no es tu correo, lo sacamos
    if (userData && userData.email !== "f.defilippi@gmail.com") {
      Swal.fire("Acceso Denegado", "No tenés permisos de Super Administrador para ver esta sección.", "error");
      navigate("/fixture");
    }
  }, [userData, navigate]);

  // ==========================================
  // 2. CARGAR TODAS LAS EMPRESAS (Para el filtro)
  // ==========================================
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "empresas"));
        const listaEmpresas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmpresas(listaEmpresas);
      } catch (error) {
        console.error("Error al cargar las empresas:", error);
      }
    };

    if (userData?.email === "f.defilippi@gmail.com") {
      cargarEmpresas();
    }
  }, [userData]);

  // ==========================================
  // 3. CARGAR USUARIOS (Filtrados o todos)
  // ==========================================
  useEffect(() => {
    if (userData?.email === "f.defilippi@gmail.com") {
      cargarUsuariosSuperAdmin();
    }
  }, [empresaFiltro, userData]);

  const cargarUsuariosSuperAdmin = async () => {
    try {
      let q;
      if (empresaFiltro === "") {
        // Trae TODOS los usuarios de la base de datos
        q = collection(db, "usuarios");
      } else {
        // Trae solo los de la empresa seleccionada en el combo
        q = query(collection(db, "usuarios"), where("empresaId", "==", empresaFiltro));
      }
      
      const snapshot = await getDocs(q);
      const listaUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(listaUsers);
    } catch (error) {
      console.error("Error al cargar usuarios globales:", error);
    }
  };

  // ==========================================
  // LÓGICA DEL CRUD DE USUARIOS
  // ==========================================
  const abrirEditarUsuario = (user) => {
    setUsuarioSeleccionado({ ...user });
    setShowEditModal(true);
  };

  const handleGuardarUsuario = async () => {
    if (!usuarioSeleccionado.nombre || !usuarioSeleccionado.legajo) {
      Swal.fire("Error", "Completá los campos obligatorios.", "error");
      return;
    }
    try {
      const userRef = doc(db, "usuarios", usuarioSeleccionado.id);
      await updateDoc(userRef, {
        nombre: usuarioSeleccionado.nombre,
        legajo: usuarioSeleccionado.legajo,
        rol: usuarioSeleccionado.rol
      });
      
      Swal.fire("Actualizado", "Colaborador modificado con éxito.", "success");
      setShowEditModal(false);
      cargarUsuariosSuperAdmin();
    } catch (error) {
      Swal.fire("Error", "No se pudo actualizar el usuario.", "error");
    }
  };

  const handleEliminarUsuario = async (userId, nombre) => {
    Swal.fire({
      title: `¿Eliminar a ${nombre}?`,
      text: "Esta acción revocará su acceso a la plataforma.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, dar de baja",
      cancelButtonText: "Cancelar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "usuarios", userId));
          Swal.fire("Eliminado", "El usuario fue removido del sistema.", "success");
          cargarUsuariosSuperAdmin();
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar al usuario.", "error");
        }
      }
    });
  };

  // ==========================================
  // LÓGICA DE CARGA MANUAL DE RESULTADOS
  // ==========================================
  const handleGolesManualChange = (partidoId, campo, valor) => {
    setPartidosManuales(prev =>
      prev.map(p => p.id === partidoId ? { ...p, [campo]: valor === "" ? null : parseInt(valor) } : p)
    );
  };

  const guardarResultadoManual = async (partido) => {
    if (partido.golesLocal === null || partido.golesVisitante === null) {
      Swal.fire("Atención", "Especificá los goles de ambos equipos antes de forzar el resultado.", "warning");
      return;
    }

    try {
      // Usamos el ID del partido como key del documento
      const partidoRef = doc(db, "resultados_oficiales", String(partido.id));
      
      // Utilizamos setDoc con merge: true para crear el documento si no existe, o actualizar si existe.
      await setDoc(partidoRef, {
        golesLocalOficial: partido.golesLocal,
        golesVisitanteOficial: partido.golesVisitante,
        estado: "Finalizado"
      }, { merge: true });

      Swal.fire({
        title: "¡Resultado Forzado!",
        text: `Partido ${partido.id} actualizado a ${partido.golesLocal} - ${partido.golesVisitante}`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error al forzar resultado:", error);
      Swal.fire("Error", "No se pudo guardar el resultado oficial en la base de datos.", "error");
    }
  };

  // Si no sos vos, no renderiza la UI (evita parpadeos antes del redireccionamiento)
  if (userData?.email !== "f.defilippi@gmail.com") return null;

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-danger text-white p-3 rounded-3 shadow-sm">
        <div>
          <h2 className="m-0 fw-bold">👑 SUPER ADMIN GLOBAL</h2>
          <small>Acceso exclusivo autorizado para: f.defilippi@gmail.com</small>
        </div>
        <Badge bg="dark" className="p-2 fs-6">God Mode</Badge>
      </div>

      <Tabs defaultActiveKey="usuarios" className="mb-4 custom-tabs" fill>
        {/* PESTAÑA CRUD USUARIOS MULTI-EMPRESA */}
        <Tab eventKey="usuarios" title="👥 Control de Colaboradores Global">
          <Card className="shadow-sm border-0 mb-3">
            <Card.Body className="bg-light">
              <Row className="align-items-center">
                <Col md={4}>
                  <h6 className="m-0 fw-bold">Filtrar por Empresa:</h6>
                </Col>
                <Col md={8}>
                  <Form.Select 
                    value={empresaFiltro} 
                    onChange={(e) => setEmpresaFiltro(e.target.value)}
                  >
                    <option value="">🌎 VER TODAS LAS EMPRESAS</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table responsive hover align="middle" className="text-center m-0">
                <thead className="table-dark">
                  <tr>
                    <th>Empresa</th>
                    <th>Legajo</th>
                    <th className="text-start">Nombre Completo</th>
                    <th className="text-start">Email</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="text-muted small fw-bold">
                        {u.empresaNombre || "N/A"}
                      </td>
                      <td className="fw-bold">{u.legajo}</td>
                      <td className="text-start">{u.nombre}</td>
                      <td className="text-start text-muted">{u.email}</td>
                      <td>
                        <Badge bg={(Array.isArray(u.rol) ? u.rol.includes("admin") : u.rol === "admin") ? "danger" : "primary"}>
                          {Array.isArray(u.rol) 
                            ? u.rol.join(" / ").toUpperCase() 
                            : (u.rol?.toUpperCase() || "EMPLEADO")}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="warning" size="sm" className="me-2 fw-bold text-white" onClick={() => abrirEditarUsuario(u)}>
                          ✏️ Editar
                        </Button>
                        <Button variant="danger" size="sm" className="fw-bold" onClick={() => handleEliminarUsuario(u.id, u.nombre)}>
                          🗑️ Baja
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-4 text-muted">No se encontraron usuarios para esta selección.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* PESTAÑA CONTINGENCIA API */}
        <Tab eventKey="contingencia" title="🚨 Carga Contingencia Resultados Oficiales">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-warning text-dark fw-bold">
              ⚠️ Panel Maestro: Los resultados cargados aquí afectarán el puntaje de TODAS las empresas.
            </Card.Header>
            <Card.Body>
              <div className="admin-contingencia-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                {partidosManuales.map((partido) => (
                  <Card key={partido.id} className="border border-secondary-subtle">
                    <Card.Body className="p-2">
                      <div className="d-flex justify-content-between text-muted small mb-2">
                        <span>ID Partido: <strong>#{partido.id}</strong></span>
                        <span>Fase: {partido.fase || "Grupos"}</span>
                      </div>
                      
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <div className="text-center w-50">
                          <span className="d-block small fw-semibold text-truncate">{partido.local}</span>
                          <Form.Control
                            type="number"
                            size="sm"
                            min="0"
                            placeholder="Goles"
                            value={partido.golesLocal ?? ""}
                            onChange={(e) => handleGolesManualChange(partido.id, "golesLocal", e.target.value)}
                            className="text-center mt-1"
                          />
                        </div>
                        
                        <div className="fw-bold text-muted mt-3">VS</div>

                        <div className="text-center w-50">
                          <span className="d-block small fw-semibold text-truncate">{partido.visitante}</span>
                          <Form.Control
                            type="number"
                            size="sm"
                            min="0"
                            placeholder="Goles"
                            value={partido.golesVisitante ?? ""}
                            onChange={(e) => handleGolesManualChange(partido.id, "golesVisitante", e.target.value)}
                            className="text-center mt-1"
                          />
                        </div>
                      </div>

                      <Button 
                        variant="dark" 
                        size="sm" 
                        className="w-100 mt-2 fw-bold"
                        onClick={() => guardarResultadoManual(partido)}
                      >
                        💾 Forzar Resultado Oficial
                      </Button>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* ==========================================
          MODAL DE EDICIÓN DE COLABORADOR
          ========================================== */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">Editar Datos de Colaborador</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {usuarioSeleccionado && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Nombre y Apellido</Form.Label>
                <Form.Control
                  type="text"
                  value={usuarioSeleccionado.nombre || ""}
                  onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, nombre: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Número de Legajo / ID Interno</Form.Label>
                <Form.Control
                  type="text"
                  value={usuarioSeleccionado.legajo || ""}
                  onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, legajo: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Permisos en la plataforma</Form.Label>
                <Form.Select
                  value={usuarioSeleccionado.rol || "user"}
                  onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, rol: e.target.value })}
                >
                  <option value="user">Empleado (Solo Pronosticar)</option>
                  <option value="admin">Administrador (Puede ver Dashboard empresa)</option>
                </Form.Select>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" size="sm" className="fw-bold" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" size="sm" className="fw-bold" onClick={handleGuardarUsuario}>
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};