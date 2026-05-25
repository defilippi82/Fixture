import React, { useEffect, useState } from "react";

import {  Form, Button, Card, Container, Row, Col, InputGroup, Spinner,} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import {  signInWithEmailAndPassword,  createUserWithEmailAndPassword,  signOut,} from "firebase/auth";

import {  collection,  getDocs,  doc,  setDoc,  addDoc,  query,  where,} from "firebase/firestore";

import { auth, db } from "../firebaseConfig/firebase";

import Swal from "sweetalert2";

import {  FaEnvelope,  FaLock,  FaBuilding,} from "react-icons/fa";

import "./Login.css";

export const Login = () => {

  // =========================================
  // STATES
  // =========================================

  const [isRegistering, setIsRegistering] = useState(false);

  const [empresas, setEmpresas] = useState([]);

  const [empresaId, setEmpresaId] =    useState("");

  const [nuevaEmpresa, setNuevaEmpresa] =    useState(false);

  const [nombreEmpresa, setNombreEmpresa] =    useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] =    useState("");

  const [confirmPassword, setConfirmPassword] =    useState("");

  const [loading, setLoading] =    useState(false);
  const navigate = useNavigate();

  // =========================================
  // CARGAR EMPRESAS
  // =========================================

  useEffect(() => {   obtenerEmpresas();
  }, []);

  const obtenerEmpresas = async () => {

    try {

      const empresasRef =
        collection(db, "empresas");

      const snapshot =
        await getDocs(empresasRef);

      const empresasData =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      setEmpresas(empresasData);

    } catch (error) {

      console.error(error);

      Swal.fire(
        "Error",
        "No se pudieron cargar las empresas.",
        "error"
      );
    }
  };

  // =========================================
  // SUBMIT
  // =========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    // =========================================
    // VALIDACIONES
    // =========================================

    if (!email || !password) {

      Swal.fire(
        "Campos incompletos",
        "Completá todos los campos.",
        "warning"
      );

      return;
    }

    // =========================================
    // REGISTRO
    // =========================================

    if (isRegistering) {

      if (
        !empresaId &&
        !nuevaEmpresa
      ) {

        Swal.fire(
          "Error",
          "Seleccioná una empresa.",
          "error"
        );

        return;
      }

      if (
        nuevaEmpresa &&
        !nombreEmpresa
      ) {

        Swal.fire(
          "Error",
          "Ingresá el nombre de la empresa.",
          "error"
        );

        return;
      }

      if (
        password !== confirmPassword
      ) {

        Swal.fire(
          "Error",
          "Las contraseñas no coinciden.",
          "error"
        );

        return;
      }

      if (password.length < 6) {

        Swal.fire(
          "Error",
          "La contraseña debe tener mínimo 6 caracteres.",
          "error"
        );

        return;
      }
    }

    try {

      setLoading(true);

      // =========================================
      // LOGIN
      // =========================================

      if (!isRegistering) {

        if (!empresaId) {

          Swal.fire(
            "Error",
            "Seleccioná una empresa.",
            "error"
          );

          return;
        }

        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

        const firebaseUser =
          userCredential.user;

        // Buscar usuario Firestore

        const userQuery = query(
          collection(db, "usuarios"),
          where(
            "uid",
            "==",
            firebaseUser.uid
          )
        );

        const userSnapshot =
          await getDocs(userQuery);

        if (userSnapshot.empty) {

          await signOut(auth);

          Swal.fire(
            "Error",
            "Usuario no encontrado.",
            "error"
          );

          return;
        }

        const usuario =
          userSnapshot.docs[0].data();

        // Validar empresa

        if (
          usuario.empresaId !==
          empresaId
        ) {

          await signOut(auth);

          Swal.fire(
            "Empresa incorrecta",
            "El usuario no pertenece a la empresa seleccionada.",
            "error"
          );

          return;
        }

          Swal.fire({
            icon: "success",
            title: "Bienvenido",
            text: "Ingreso exitoso",
            timer: 1500,
            showConfirmButton: false,
          });

          navigate("/fixture");

        return;
      }

      // =========================================
      // REGISTRO
      // =========================================

      let empresaFinalId = empresaId;

      let empresaNombreFinal = "";

      // =========================================
      // CREAR NUEVA EMPRESA
      // =========================================

      if (nuevaEmpresa) {

        const empresaRef =
          await addDoc(
            collection(db, "empresas"),
            {
              nombre: nombreEmpresa,
              activa: true,
              createdAt:
                new Date().toISOString(),
            }
          );

        empresaFinalId = empresaRef.id;

        empresaNombreFinal =
          nombreEmpresa;

      } else {

        const empresaSeleccionada =
          empresas.find(
            (e) => e.id === empresaId
          );

        empresaNombreFinal =
          empresaSeleccionada?.nombre ||
          "";
      }

      // =========================================
      // CREAR USUARIO AUTH
      // =========================================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const firebaseUser =
        userCredential.user;

      // =========================================
      // GUARDAR FIRESTORE
      // =========================================

      await setDoc(
        doc(
          db,
          "usuarios",
          firebaseUser.uid
        ),
        {
          uid: firebaseUser.uid,

          email,

          empresaId: empresaFinalId,

          empresaNombre:
            empresaNombreFinal,

          rol: "usuario",

          activo: true,

          createdAt:
            new Date().toISOString(),
        }
      );

      // =========================================
      // RECARGAR EMPRESAS
      // =========================================

      await obtenerEmpresas();

      Swal.fire({
        icon: "success",
        title: "Registro exitoso",
        text: "La cuenta fue creada correctamente.",
      });

      // =========================================
      // LIMPIAR
      // =========================================

      setEmail("");

      setPassword("");

      setConfirmPassword("");

      setEmpresaId("");

      setNombreEmpresa("");

      setNuevaEmpresa(false);

      setIsRegistering(false);

    } catch (error) {

      console.error(error);

      let mensaje =
        "Ocurrió un error.";

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        mensaje =
          "El email ya está registrado.";
      }

      if (
        error.code ===
        "auth/invalid-credential"
      ) {

        mensaje =
          "Credenciales incorrectas.";
      }

      if (
        error.code ===
        "auth/weak-password"
      ) {

        mensaje =
          "La contraseña es demasiado débil.";
      }

      Swal.fire(
        "Error",
        mensaje,
        "error"
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="login-page">

      <Container>

        <Row className="justify-content-center align-items-center min-vh-100">

          <Col xs={12} sm={10} md={7} lg={5}>

            <Card className="login-card">

              <Card.Body>

                {/* LOGO */}

                <div className="login-logo">
                  🌎 PRODE MUNDIAL 2026
                </div>

                <h2 className="login-title">

                  {isRegistering
                    ? "Registro"
                    : "Iniciar Sesión"}

                </h2>

                <Form onSubmit={handleSubmit}>

                  {/* EMPRESA */}

                  <Form.Group className="mb-3">

                    <Form.Label>
                      Empresa
                    </Form.Label>

                    <InputGroup>

                      <InputGroup.Text>
                        <FaBuilding />
                      </InputGroup.Text>

                      <Form.Select
                        value={
                          nuevaEmpresa
                            ? "nueva"
                            : empresaId
                        }
                        onChange={(e) => {

                          if (
                            e.target.value ===
                            "nueva"
                          ) {

                            setNuevaEmpresa(true);

                            setEmpresaId("");

                          } else {

                            setNuevaEmpresa(false);

                            setEmpresaId(
                              e.target.value
                            );
                          }
                        }}
                      >

                        <option value="">
                          Seleccionar empresa
                        </option>

                        {empresas.map(
                          (empresa) => (

                            <option
                              key={empresa.id}
                              value={empresa.id}
                            >
                              {empresa.nombre}
                            </option>

                          )
                        )}

                        {isRegistering && (

                          <option value="nueva">
                            + Crear nueva empresa
                          </option>

                        )}

                      </Form.Select>

                    </InputGroup>

                    {/* NUEVA EMPRESA */}

                    {
                      nuevaEmpresa && (

                        <Form.Control
                          className="mt-3"
                          type="text"
                          placeholder="Nombre de la empresa"
                          value={nombreEmpresa}
                          onChange={(e) =>
                            setNombreEmpresa(
                              e.target.value
                            )
                          }
                        />

                      )
                    }

                  </Form.Group>

                  {/* EMAIL */}

                  <Form.Group className="mb-3">

                    <Form.Label>
                      Email
                    </Form.Label>

                    <InputGroup>

                      <InputGroup.Text>
                        <FaEnvelope />
                      </InputGroup.Text>

                      <Form.Control
                        type="email"
                        placeholder="usuario@email.com"
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target.value
                          )
                        }
                      />

                    </InputGroup>

                  </Form.Group>

                  {/* PASSWORD */}

                  <Form.Group className="mb-3">

                    <Form.Label>
                      Contraseña
                    </Form.Label>

                    <InputGroup>

                      <InputGroup.Text>
                        <FaLock />
                      </InputGroup.Text>

                      <Form.Control
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                      />

                    </InputGroup>

                  </Form.Group>

                  {/* CONFIRM PASSWORD */}

                  {
                    isRegistering && (

                      <Form.Group className="mb-4">

                        <Form.Label>
                          Confirmar contraseña
                        </Form.Label>

                        <InputGroup>

                          <InputGroup.Text>
                            <FaLock />
                          </InputGroup.Text>

                          <Form.Control
                            type="password"
                            placeholder="********"
                            value={confirmPassword}
                            onChange={(e) =>
                              setConfirmPassword(
                                e.target.value
                              )
                            }
                          />

                        </InputGroup>

                      </Form.Group>

                    )
                  }

                  {/* BOTON */}

                  <Button
                    type="submit"
                    className="login-btn"
                    disabled={loading}
                  >

                    {
                      loading ? (

                        <Spinner
                          animation="border"
                          size="sm"
                        />

                      ) : isRegistering ? (

                        "Crear Cuenta"

                      ) : (

                        "Ingresar"

                      )
                    }

                  </Button>

                  {/* TOGGLE */}

                  <div className="toggle-login">

                    <Button
                      variant="link"
                      onClick={() => {

                        setIsRegistering(
                          !isRegistering
                        );

                        setEmail("");

                        setPassword("");

                        setConfirmPassword("");

                        setEmpresaId("");

                        setNuevaEmpresa(false);

                        setNombreEmpresa("");
                      }}
                    >

                      {
                        isRegistering
                          ? "¿Ya tenés cuenta? Iniciá sesión"
                          : "¿No tenés cuenta? Registrate"
                      }

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