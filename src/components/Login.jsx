import React, { useEffect, useState } from "react";
import { Form, Button, Card, Container, Row, Col, InputGroup, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig/firebase";
import Swal from "sweetalert2";
import { FaEnvelope, FaLock, FaBuilding, FaUser, FaIdCard } from "react-icons/fa";
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
  
  // Nuevos estados para el perfil del colaborador
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [legajo, setLegajo] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // =========================================
  // CARGAR EMPRESAS
  // =========================================
  useEffect(() => {
    obtenerEmpresas();
  }, []);

  const obtenerEmpresas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "empresas"));
      const lista = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmpresas(lista);
    } catch (error) {
      console.error("Error al traer empresas:", error);
    }
  };

  // =========================================
  // SUBMIT HANDLER (LOGIN / REGISTRO)
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      Swal.fire("Error", "Por favor completa los campos básicos.", "error");
      return;
    }

    setLoading(true);

    if (isRegistering) {
      // -------------------------------------
      // VALIDACIONES DE REGISTRO
      // -------------------------------------
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
      if (nuevaEmpresa && !nombreEmpresa.trim()) {
        Swal.fire("Error", "Falta el nombre de la nueva empresa.", "error");
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

        // Si es una empresa nueva, primero la creamos en Firestore
        if (nuevaEmpresa) {
          const nuevaEmpresaRef = doc(collection(db, "empresas"));
          finalEmpresaId = nuevaEmpresaRef.id;
          finalEmpresaNombre = nombreEmpresa.trim();
          await setDoc(nuevaEmpresaRef, { nombre: finalEmpresaNombre });
        } else {
          const empSeleccionada = empresas.find((e) => e.id === empresaId);
          finalEmpresaNombre = empSeleccionada ? empSeleccionada.nombre : "Corporativo";
        }

        // Crear el usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Unificamos Nombre y Apellido en un solo string
        const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;

        // Guardar el perfil completo del colaborador en Firestore usando su UID como ID del documento
        await setDoc(doc(db, "usuarios", user.uid), {
          nombre: nombreCompleto,
          legajo: legajo.trim(),
          email: user.email,
          empresaId: finalEmpresaId,
          empresaNombre: finalEmpresaNombre,
          rol: "user", // Rol por defecto (Empleado)
          createdAt: new Date()
        });

        setLoading(false);
        
        Swal.fire({
          title: "¡Cuenta Creada!",
          text: `Bienvenido/a al Prode Corporativo, ${nombreCompleto}.`,
          icon: "success",
          confirmButtonText: "Ir al Fixture"
        }).then(() => {
          // El usuario ya queda autenticado por Firebase, lo enviamos directo al Prode
          navigate("/fixture");
        });

      } catch (error) {
        setLoading(false);
        console.error("Error en registro:", error);
        let mensajeError = "No se pudo crear la cuenta.";
        if (error.code === "auth/email-already-in-use") {
          mensajeError = "Este correo electrónico ya está registrado.";
        } else if (error.code === "auth/weak-password") {
          mensajeError = "La contraseña debe tener al menos 6 caracteres.";
        }
        Swal.fire("Error", mensajeError, "error");
      }

    } else {
      // -------------------------------------
      // LÓGICA DE LOGIN TRADICIONAL
      // -------------------------------------
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setLoading(false);
        navigate("/fixture");
      } catch (error) {
        setLoading(false);
        console.error("Error en login:", error);
        let mensajeError = "Credenciales incorrectas.";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
          mensajeError = "Email o contraseña inválidos.";
        }
        Swal.fire("Error", mensajeError, "error");
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
                  <h2 className="fw-bold text-white">🏆 Fixture 2026</h2>
                  <p className="text-muted">
                    {isRegistering ? "Completá tus datos para registrarte" : "Iniciá sesión para pronosticar"}
                  </p>
                </div>

                <Form onSubmit={handleSubmit}>
                  
                  {/* INPUTS EXCLUSIVOS PARA REGISTRO */}
                  {isRegistering && (
                    <>
                      {/* Nombre */}
                      <Form.Group className="mb-3">
                        <InputGroup>
                          <InputGroup.Text><FaUser className="text-secondary" /></InputGroup.Text>
                          <span className="input-group-text text-secondary">Nombre</span>
                          <Form.Control
                            type="text"
                            placeholder="Nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                          />
                        </InputGroup>
                      </Form.Group>

                      {/* Apellido */}
                      <Form.Group className="mb-3">
                        <InputGroup>
                          <InputGroup.Text><FaUser className="text-secondary" /></InputGroup.Text>
                          <span className="input-group-text text-secondary">Apellido</span>
                          <Form.Control
                            type="text"
                            placeholder="Apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            required
                          />
                        </InputGroup>
                      </Form.Group>

                      {/* Legajo */}
                      <Form.Group className="mb-4">
                        <InputGroup>
                          <InputGroup.Text><FaIdCard className="text-secondary" /></InputGroup.Text>
                          <span className="input-group-text text-secondary">Legajo</span>
                          <Form.Control
                            type="text"
                            placeholder="Número de Legajo / ID Empleado"
                            value={legajo}
                            onChange={(e) => setLegajo(e.target.value)}
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                      
                      <hr className="my-3 border-secondary-subtle" />
                    </>
                  )}

                  {/* Campos de Email y Contraseña (Comunes para Login y Registro) */}
                  
                  <Form.Group className="mb-4">
                          <InputGroup>
                            <InputGroup.Text><FaBuilding className="text-secondary" /></InputGroup.Text>
                            <Form.Select
                              value={empresaId}
                              onChange={(e) => setEmpresaId(e.target.value)}
                              required
                            >
                              <option value="">Selecciona tu Empresa...</option>
                              {empresas.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.nombre}
                                </option>
                              ))}
                            </Form.Select>
                          </InputGroup>
                        </Form.Group>
                  <Form.Group className="mb-3">
                      <span className="input-group-text text-secondary">Correo electrónico</span>
                    <InputGroup>
                      <InputGroup.Text><FaEnvelope className="text-secondary" /></InputGroup.Text>
                      <Form.Control
                        type="email"
                        placeholder="Correo electrónico corporativo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3">
                      <span className="input-group-text text-secondary">Contraseña</span>
                    <InputGroup>
                      <InputGroup.Text><FaLock className="text-secondary" /></InputGroup.Text>
                      <Form.Control
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  {/* Campos de Confirmación y Empresa (Exclusivos para Registro) */}
                  {isRegistering && (
                    <>
                      <Form.Group className="mb-3">
                          <span className="input-group-text text-secondary">Confirmar contraseña</span>
                        <InputGroup>
                          <InputGroup.Text><FaLock className="text-secondary" /></InputGroup.Text>
                          <Form.Control
                            type="password"
                            placeholder="Confirmar contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                        </InputGroup>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Quiero registrar una nueva empresa corporativa"
                          id="check-empresa"
                          checked={nuevaEmpresa}
                          onChange={(e) => {
                            setNuevaEmpresa(e.target.checked);
                            setEmpresaId("");
                            setNombreEmpresa("");
                          }}
                          className="small fw-semibold text-muted"
                        />
                      </Form.Group>

                      {nuevaEmpresa && (
                        <Form.Group className="mb-4">
                          <InputGroup>
                            <InputGroup.Text><FaBuilding className="text-secondary" /></InputGroup.Text>
                            <Form.Control
                              type="text"
                              placeholder="Nombre de la nueva empresa"
                              value={nombreEmpresa}
                              onChange={(e) => setNombreEmpresa(e.target.value)}
                              required
                            />
                          </InputGroup>
                        </Form.Group>
                      )}
                    </>
                  )}

                  {/* BOTÓN DE ACCIÓN PRINCIPAL */}
                  <Button
                    variant="dark"
                    type="submit"
                    className="w-100 py-2 fw-bold text-uppercase shadow-sm mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : isRegistering ? (
                      "Crear Cuenta"
                    ) : (
                      "Ingresar"
                    )}
                  </Button>

                  {/* TOGGLE ENTRE LOGIN Y REGISTRO */}
                  <div className="text-center">
                    <Button
                      variant="link"
                      className="text-decoration-none small text-secondary"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setEmail("");
                        setPassword("");
                        setConfirmPassword("");
                        setEmpresaId("");
                        setNuevaEmpresa(false);
                        setNombreEmpresa("");
                        setNombre("");
                        setApellido("");
                        setLegajo("");
                      }}
                    >
                      {isRegistering
                        ? "¿Ya tenés cuenta? Iniciá sesión"
                        : "¿No tenés cuenta? Registrate gratis"}
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