import React, { useState } from 'react';
import { Form, Button, Card, Container, Row, Col } from 'react-bootstrap';
import { auth, db } from '../firebaseConfig/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

export const Login = () => {
  // Estado para saber si muestra Login o Registro
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Estados para los campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState(''); // Solo para registro

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire('Error', 'Por favor, completá todos los campos.', 'error');
      return;
    }

    try {
      if (isRegistering) {
        // --- LÓGICA DE REGISTRO ---
        if (!companyName) {
          Swal.fire('Error', 'Por favor, ingresá el nombre de la empresa.', 'error');
          return;
        }

        // 1. Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar datos extendidos en Firestore (Colección "usuarios")
        await setDoc(doc(db, 'usuarios', user.uid), {
          uid: user.uid,
          email: email,
          empresa: companyName,
          rol: 'user', // Por defecto rol común, después se puede cambiar a admin
          createdAt: new Date().toISOString()
        });

        Swal.fire('¡Registro Exitoso!', 'Tu cuenta corporativa ha sido creada.', 'success');
      } else {
        // --- LÓGICA DE LOGIN ---
        await signInWithEmailAndPassword(auth, email, password);
        Swal.fire('¡Bienvenido!', 'Ingreso correcto.', 'success');
      }
    } catch (error) {
      console.error(error);
      let message = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/email-already-in-use') message = 'El email ya está registrado.';
      if (error.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres.';
      if (error.code === 'auth/invalid-credential') message = 'Credenciales incorrectas.';
      
      Swal.fire('Error', message, 'error');
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card className="shadow-sm p-4">
            <Card.Body>
              <h2 className="text-center mb-4">
                {isRegistering ? 'Registro Corporativo' : 'Iniciar Sesión'}
              </h2>
              
              <Form onSubmit={handleSubmit}>
                {isRegistering && (
                  <Form.Group className="mb-3" controlId="formCompanyName">
                    <Form.Label>Nombre de la Empresa</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="Ej: Transportes S.A." 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3" controlId="formBasicEmail">
                  <Form.Label>Email Corporativo</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="usuario@empresa.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicPassword">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="******" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 mb-3">
                  {isRegistering ? 'Crear Cuenta' : 'Ingresar'}
                </Button>

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      // Limpiamos campos al cambiar de pantalla
                      setEmail('');
                      setPassword('');
                      setCompanyName('');
                    }}
                  >
                    {isRegistering 
                      ? '¿Ya tenés cuenta? Iniciá sesión acá' 
                      : '¿No tenés cuenta? Registrate acá'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
