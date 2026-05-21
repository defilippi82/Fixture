import React, { useState } from "react";
import { Form, Button, Card, Container, Row, Col, Alert } from "react-bootstrap";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1. Autenticar en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Verificar que exista en la colección de usuarios de Firestore
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      
      if (!userDoc.exists()) {
        throw new Error("El usuario no está registrado en el sistema de empresas.");
      }

      const datosUsuario = userDoc.data();

      // 3. Validar si la empresa asociada está activa
      const empresaDoc = await getDoc(doc(db, "empresas", datosUsuario.empresaId));
      if (!empresaDoc.exists() || !empresaDoc.data().activa) {
        throw new Error("La empresa asociada a este usuario no se encuentra activa.");
      }

      Swal.fire({
        title: `¡Bienvenido, ${datosUsuario.nombre}!`,
        text: `Entrando al Prode de ${empresaDoc.data().nombre}`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });

      navigate("/fixture"); // Redirecciona al fixture de pctmitre2

    } catch (err) {
      console.error(err);
      setError(err.message || "Credenciales incorrectas. Intentalo de nuevo.");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">🏆 Prode Corporate</h2>
                <p className="text-muted small">Ingresá con las credenciales de tu empresa</p>
              </div>

              {error && <Alert variant="danger" className="py-2 text-center small">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formBasicEmail">
                  <Form.Label className="small fw-semibold">Correo Corporativo</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="formBasicPassword">
                  <Form.Label className="small fw-semibold">Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 fw-bold py-2 rounded-3">
                  Iniciar Sesión
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};