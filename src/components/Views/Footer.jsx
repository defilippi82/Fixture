import React from 'react';

export const Footer = () => {
  return (
    
      <div className="footer">
    <hr class="sm-4" />

      
      <section class="sm-4 text-center">
       
                
        <a
           class="btn btn-outline-light btn-floating m-1"
           href="mailto:federico.filippi@trenesargentinos.gob.ar"
           role="button"
           ><i class="fa fa-train "></i
          ></a>

        <a
           class="btn btn-outline-light btn-floating m-1"
           href="https://www.linkedin.com/in/defilippi/"
           role="button"
           ><i class="fab fa-linkedin-in"></i
          ></a>

        <a
           class="btn btn-outline-light btn-floating m-1"
           href="https://github.com/defilippi82"
           role="button"
           ><i class="fab fa-github"></i
          ></a>
      </section>
      
    
      <img className="rodapie" src="/logo-grisSin-fondo.png" width="75px" height="75px" alt="Logo"/>
      <p className="eslogan">Navegá más allá de lo esperado </p>
      <p><em>Todos los derechos reservados.© 2024</em></p>
      <a href="#/privacidad" className="privacidad-link">Política de Privacidad</a>
      
    </div>
  );
};
