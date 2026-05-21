// puntosService.js

export const calcularPuntos = (golesLocalReal, golesVisitaReal, golesLocalPred, golesVisitaPred) => {
  // 1. Si el partido aún no se jugó o falta alguna predicción, 0 puntos.
  if (
    golesLocalReal === null || golesLocalReal === undefined ||
    golesVisitaReal === null || golesVisitaReal === undefined ||
    golesLocalPred === null || golesLocalPred === undefined ||
    golesVisitaPred === null || golesVisitaPred === undefined ||
    golesLocalPred === "" || golesVisitaPred === ""
  ) {
    return 0;
  }

  // Convertimos a números por seguridad
  const glReal = Number(golesLocalReal);
  const gvReal = Number(golesVisitaReal);
  const glPred = Number(golesLocalPred);
  const gvPred = Number(golesVisitaPred);

  // CONFIGURACIÓN DE PUNTOS (Modificá acá los valores si cambian las reglas)
  const PUNTOS_EXACTO = 4;
  const PUNTOS_TENDENCIA = 2; // Ganador o empate básico
  const PUNTOS_DIFERENCIA = 1; // Bonus por achicar la diferencia exacta

  // 2. ACIERTO EXACTO (Pleno): 4 puntos directos
  if (glReal === glPred && gvReal === gvPred) {
    return PUNTOS_EXACTO;
  }

  // Calculamos las diferencias de goles
  const diferenciaReal = glReal - gvReal;
  const diferenciaPred = glPred - gvPred;

  // 3. EVALUACIÓN DE TENDENCIA (Quién ganó o si fue empate)
  const acertoEmpate = (diferenciaReal === 0 && diferenciaPred === 0);
  const acertoGanadorLocal = (diferenciaReal > 0 && diferenciaPred > 0);
  const acertoGanadorVisita = (diferenciaReal < 0 && diferenciaPred < 0);

  if (acertoEmpate || acertoGanadorLocal || acertoGanadorVisita) {
    // Si entró acá, ya tiene asegurados los 3 puntos de la tendencia
    let puntosAcumulados = PUNTOS_TENDENCIA;

    // BONUS: Si además la diferencia de goles es exactamente la misma
    // Ejemplo: Real 3-1 (dif +2) y Predicción 2-0 (dif +2) -> No es exacto, pero la dif coincide.
    if (diferenciaReal === diferenciaPred) {
      puntosAcumulados += PUNTOS_DIFERENCIA; // Suma 1 punto extra (Total 4)
    }

    return puntosAcumulados;
  }

  // 4. Le erró por completo: 0 puntos
  return 0;
};