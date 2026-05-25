import React from 'react';
import '../../css/Footer.css'; // Asegúrate de tener este archivo

export const Footer = () => {
  return (
    <footer className="footer-container">
      <hr className="footer-divider" />

      {/* Logo y Eslogan */}
      <div className="footer-brand text-center mb-3">
        <img className="rodapie" src="../../img/logo-grisSin-fondo.png" alt="Logo" />
        <p className="eslogan mt-2">Navegá más allá de lo esperado</p>
      </div>

      {/* Social Icons */}
      <section className="social-icons text-center mb-3">
        <a className="btn btn-outline-light btn-floating m-1" href="mailto:federico.filippi@trenesargentinos.gob.ar" role="button">
          <i className="fa fa-train"></i>
        </a>
        <a className="btn btn-outline-light btn-floating m-1" href="https://www.linkedin.com/in/defilippi/" role="button">
          <i className="fab fa-linkedin-in"></i>
        </a>
        <a className="btn btn-outline-light btn-floating m-1" href="https://github.com/defilippi82" role="button">
          <i className="fab fa-github"></i>
        </a>
      </section>

      {/* Derechos y Privacidad */}
      <div className="footer-bottom text-center">
        <p className="copyright"><em>Todos los derechos reservados © 2024</em></p>
        <a href="#/privacidad" className="privacidad-link">Política de Privacidad</a>
      </div>
    </footer>
  );
};