import React, { useContext, useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Tabs, Tab } from "react-bootstrap";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase.js";
import { UserContext } from "../context/UserContext.jsx";
import { fixtureConLimite } from "../../components/fixtureData";
import { fixtureFase2ConLimite } from "../../components/fixtureData2";
import Swal from "sweetalert2";

const todosLosPartidos = [...fixtureConLimite, ...fixtureFase2ConLimite];

export const AdminEmpresaDashboard = () => {
  const { userData, empresaData } = useContext(UserContext);
  const [usuarios, setUsuarios] = useState([]);
  const [partidosManuales, setPartidosManuales] = useState(todosLosPartidos);
  
  // Estados para Modal de Edición de Usuario
  const [showEditModal, setShowEditModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  useEffect(() => {
    if (userData?.empresaId) {
      cargarUsuariosEmpresa();
    }
  }, [userData]);

  // ==========================================
  // LÓGICA DEL CRUD DE USUARIOS
  // ==========================================
  const cargarUsuariosEmpresa = async () => {
    try {
      const q = query(collection(db, "usuarios"), where("empresaId", "==", userData.empresaId));
      const snapshot = await getDocs(q);
      const listaUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(listaUsers);
    } catch (error) {
      console.error("Error al cargar usuarios de la empresa:", error);
    }
  };

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
      cargarUsuariosEmpresa();
    } catch (error) {
      Swal.fire("Error", "No se pudo actualizar el usuario.", "error");
    }
  };

  const handleEliminarUsuario = async (userId, nombre) => {
    Swal.fire({
      title: `¿Eliminar a ${nombre}?`,
      text: "Esta acción revocará su acceso al Prode de la empresa.",
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
          cargarUsuariosEmpresa();
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
      // 1. Guardar el resultado real en la colección global de partidos de control
      const partidoRef = doc(db, "resultados_oficiales", String(partido.id));
      await updateDoc(partidoref, {
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
      // Si el documento no existe inicialmente, usamos un setDoc o update según tu backend
      console.error("Error al forzar resultado:", error);
      Swal.fire("Error", "Asegurate de tener los permisos o la colección creada en Firestore.", "error");
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-dark text-white p-3 rounded-3 shadow-sm">
        <div>
          <h2 className="m-0 fw-bold">⚙️ Panel Admin: {empresaData?.nombre || "Cargando..."}</h2>
          <small className="text-muted">Gestión de personal y contingencia de resultados</small>
        </div>
        <Badge bg="danger" className="p-2 fs-6">Modo Administrador</Badge>
      </div>

      <Tabs defaultActiveKey="usuarios" className="mb-4 custom-tabs" fill>
        {/* PESTAÑA CRUD USUARIOS */}
        <Tab eventKey="usuarios" title="👥 Control de Colaboradores">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table responsive hover align="middle" className="text-center m-0">
                <thead className="table-secondary">
                  <tr>
                    <th>Legajo</th>
                    <th className="text-start">Nombre Completo</th>
                    <th className="text-start">Email Corporativo</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-bold">{u.legajo}</td>
                      <td className="text-start">{u.nombre}</td>
                      <td className="text-start text-muted">{u.email}</td>
                      <td>
                        <Badge bg={u.rol === "admin" ? "danger" : "primary"}>
                          {u.rol?.toUpperCase() || "EMPLEADO"}
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
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* PESTAÑA CONTINGENCIA API */}
        <Tab eventKey="contingencia" title="🚨 Carga Contingencia Resultados (No API)">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-warning text-dark fw-bold">
              ⚠️ Usar solo si la API internacional de OpenFootball no responde o tiene demoras en actualizar.
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
                  <option value="admin">Administrador (Acceso Total)</option>
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