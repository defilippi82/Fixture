import React, { useEffect, useState } from "react";
import { Form, Button, Card, Container, Row, Col, InputGroup, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig/firebase";
import Swal from "sweetalert2";
import { FaEnvelope, FaLock, FaBuilding, FaUser, FaIdCard, FaDollarSign } from "react-icons/fa";
import "../css/Login.css";

export const Login = () => {
  // =========================================
  // STATES
  // =========================================
  const [isRegistering, setIsRegistering] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState("");
  const [nuevaEmpresa, setNuevaEmpresa] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [montoPorParticipante, setMontoPorParticipante] = useState(""); // Nuevo estado
  
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [legajo, setLegajo] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { obtenerEmpresas(); }, []);

  const obtenerEmpresas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "empresas"));
      setEmpresas(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error("Error al traer empresas:", error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      Swal.fire("Error", "Por favor completa los campos básicos.", "error");
      return;
    }

    setLoading(true);

    if (isRegistering) {
      if (!nombre.trim() || !apellido.trim() || !legajo.trim()) {
        Swal.fire("Error", "Nombre, Apellido y Legajo son obligatorios.", "error");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        Swal.fire("Error", "Las contraseñas no coinciden.", "error");
        setLoading(false);
        return;
      }
      if (nuevaEmpresa && (!nombreEmpresa.trim() || !montoPorParticipante)) {
        Swal.fire("Error", "Falta el nombre o el monto de la nueva empresa.", "error");
        setLoading(false);
        return;
      }
      if (!nuevaEmpresa && !empresaId) {
        Swal.fire("Error", "Selecciona una empresa corporativa.", "error");
        setLoading(false);
        return;
      }

      try {
        let finalEmpresaId = empresaId;
        let finalEmpresaNombre = "";

        if (nuevaEmpresa) {
          const nuevaEmpresaRef = doc(collection(db, "empresas"));
          finalEmpresaId = nuevaEmpresaRef.id;
          finalEmpresaNombre = nombreEmpresa.trim();
          await setDoc(nuevaEmpresaRef, { 
            nombre: finalEmpresaNombre,
            montoPorParticipante: Number(montoPorParticipante) 
          });
        } else {
          const empSeleccionada = empresas.find((e) => e.id === empresaId);
          finalEmpresaNombre = empSeleccionada ? empSeleccionada.nombre : "Corporativo";
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "usuarios", user.uid), {
          nombre: `${nombre.trim()} ${apellido.trim()}`,
          legajo: legajo.trim(),
          email: user.email,
          empresaId: finalEmpresaId,
          empresaNombre: finalEmpresaNombre,
          rol: nuevaEmpresa ? "admin" : "user", // El primero que crea la empresa es admin
          createdAt: new Date()
        });

        setLoading(false);
        Swal.fire("¡Cuenta Creada!", "Bienvenido al Fixture.", "success").then(() => navigate("/fixture"));
      } catch (error) {
        setLoading(false);
        Swal.fire("Error", "No se pudo crear la cuenta: " + error.message, "error");
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/fixture");
      } catch {
        setLoading(false);
        Swal.fire("Error", "Credenciales incorrectas.", "error");
      }
    }
  };

  return (
    <div className="login-wrapper d-flex align-items-center justify-content-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="login-card shadow-lg border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-white">🏆 Fixture 2026 🌎</h2>
                  <p className="text-muted">{isRegistering ? "Completá tus datos" : "Iniciá sesión"}</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  {isRegistering && (
                    <>
                      <Form.Group className="mb-3">
                        <InputGroup>
                          <InputGroup.Text><FaUser /></InputGroup.Text>
                          <span className="input-group-text">Nombre</span>
                          <Form.Control type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                        </InputGroup>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <InputGroup>
                          <InputGroup.Text><FaUser /></InputGroup.Text>
                          <span className="input-group-text">Apellido</span>
                          <Form.Control type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                        </InputGroup>
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <InputGroup>
                          <InputGroup.Text><FaIdCard /></InputGroup.Text>
                          <span className="input-group-text">Legajo</span>
                          <Form.Control type="text" placeholder="Legajo" value={legajo} onChange={(e) => setLegajo(e.target.value)} required />
                        </InputGroup>
                      </Form.Group>
                    </>
                  )}

                  {!isRegistering && (
                    <Form.Group className="mb-4">
                      <InputGroup>
                        <span className="input-group-text">Empresa</span>
                        <InputGroup.Text><FaBuilding /></InputGroup.Text>
                        <Form.Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} required>
                          <option value="">Selecciona tu Empresa...</option>
                          {empresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                        </Form.Select>
                      </InputGroup>
                    </Form.Group>
                  )}

                  {isRegistering && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Check type="checkbox" label="Registrar nueva empresa" checked={nuevaEmpresa} onChange={(e) => setNuevaEmpresa(e.target.checked)} />
                      </Form.Group>
                      {nuevaEmpresa && (
                        <>
                          <Form.Group className="mb-3">
                            <InputGroup>
                              <span className="input-group-text">Nombre Empresa</span>
                              <InputGroup.Text><FaBuilding /></InputGroup.Text>
                              <Form.Control type="text" placeholder="Nombre nueva empresa" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} required />
                            </InputGroup>
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <InputGroup>
                              <InputGroup.Text><FaDollarSign /></InputGroup.Text>
                              <span className="input-group-text">Monto por Participante</span>
                              <Form.Control type="number" placeholder="Monto por participante ($)" value={montoPorParticipante} onChange={(e) => setMontoPorParticipante(e.target.value)} required />
                            </InputGroup>
                          </Form.Group>
                        </>
                      )}
                    </>
                  )}

                  <Form.Group className="mb-3">
                    <InputGroup>
                      <span className="input-group-text">Email</span>
                      <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                      <Form.Control type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <InputGroup>
                      <span className="input-group-text">Contraseña</span>
                      <InputGroup.Text><FaLock /></InputGroup.Text>
                      <Form.Control type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </InputGroup>
                  </Form.Group>

                  {isRegistering && (
                    <Form.Group className="mb-3">
                      <InputGroup>
                        <span className="input-group-text">Confirmar Contraseña</span>
                        <InputGroup.Text><FaLock /></InputGroup.Text>
                        <Form.Control type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                      </InputGroup>
                    </Form.Group>
                  )}

                  <Button variant="dark" type="submit" className="w-100 py-2 fw-bold text-uppercase" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : (isRegistering ? "Crear Cuenta" : "Ingresar")}
                  </Button>

                  <div className="text-center mt-3">
                    <Button variant="link" onClick={() => setIsRegistering(!isRegistering)}>
                      {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate gratis"}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};