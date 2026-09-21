/* ============================================================
   FLORES AMARILLAS — lógica de la experiencia
   ------------------------------------------------------------
   Índice:
     01. Configuración editable   ← empieza por aquí
     02. Utilidades
     03. Navegación entre pantallas
     04. Pantalla inicial
     05. Recuerdos (fotos)
     06. Pantalla final (secuencia)
     07. Ramo de flores (SVG)
     08. Partículas y corazones
     09. Música
     10. Contador de días
     11. Parallax muy ligero
     12. Arranque
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     01. CONFIGURACIÓN EDITABLE
     Todo lo que probablemente quieras cambiar está aquí.
     ========================================================== */

  const CONFIG = {

    /* Contador opcional -------------------------------------
       Pon la fecha en la que empezó su historia:
         fechaInicio: new Date("2026-03-14")
       Déjalo en null para que el contador no aparezca.       */
    fechaInicio: null,

    /* Texto que acompaña al contador. {dias} se reemplaza solo. */
    textoContador: "Hace <b>{dias} días</b> que esta historia empezó",

    /* Música -------------------------------------------------
       Coloca tu canción en assets/musica/cancion.mp3
       Si el archivo no existe, el control se oculta solo.     */
    volumen: 0.45,

    /* Ramos --------------------------------------------------
       Número de flores de cada ramo.                          */
    floresInicio: 5,
    floresFinal: 11,

    /* Partículas ---------------------------------------------
       Sube o baja la densidad (milisegundos entre partículas). */
    ritmoParticulasSuave: 1400,
    ritmoParticulasFinal: 380,
    ritmoCorazones: 2600
  };

  /* Recuerdos ------------------------------------------------
     Cambia aquí las fotos y los textos.
     Las fotos van en assets/fotos/                            */
  const RECUERDOS = [
    {
      foto: "assets/fotos/foto1.jpg",
      alt: "Primer recuerdo",
      texto: "Hay momentos que parecen pequeños mientras pasan, y luego resulta que eran de los importantes."
    },
    {
      foto: "assets/fotos/foto2.jpg",
      alt: "Segundo recuerdo",
      texto: "De todos los días que hemos compartido, hay algunos que recuerdo de otra manera."
    },
    {
      foto: "assets/fotos/foto3.jpg",
      alt: "Tercer recuerdo",
      texto: "Son esos pequeños recuerdos que uno termina guardando con tanto amor."
    },
    {
      foto: "assets/fotos/foto4.jpg",
      alt: "Cuarto recuerdo",
      texto: "Y si pudiera vivir otra vez cada uno de estos momentos, los volvería a elegir sin pensarlo."
    }
  ];

  /* Texto del botón en cada recuerdo (el último es distinto) */
  const TEXTOS_BOTON = ["Seguir", "Seguir", "Seguir", "Ya casi"];


  /* ==========================================================
     02. UTILIDADES
     ========================================================== */

  const $ = (sel) => document.querySelector(sel);
  const azar = (min, max) => Math.random() * (max - min) + min;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const movimientoReducido =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function crearSVG(tag, atributos) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const clave in atributos) {
      el.setAttribute(clave, atributos[clave]);
    }
    return el;
  }

  /* Referencias al DOM */
  const pantallas       = {
    inicio:    $("#pantallaInicio"),
    mensaje:   $("#pantallaMensaje"),
    recuerdos: $("#pantallaRecuerdos"),
    final:     $("#pantallaFinal")
  };
  const destello        = $("#destelloTransicion");
  const capaParticulas  = $("#capaParticulas");
  const audio           = $("#audio");
  const botonMusica     = $("#botonMusica");
  const musicaTexto     = $("#musicaTexto");


  /* ==========================================================
     03. NAVEGACIÓN ENTRE PANTALLAS
     ========================================================== */

  let pantallaActual = pantallas.inicio;
  let navegando = false;

  function irA(destino, alLlegar) {
    if (navegando || destino === pantallaActual) return;
    navegando = true;

    const anterior = pantallaActual;

    /* Destello dorado que une las dos pantallas */
    destello.classList.remove("encendido");
    void destello.offsetWidth;          // reinicia la animación
    destello.classList.add("encendido");

    /* La pantalla actual se va con un pequeño zoom */
    anterior.classList.remove("visible");
    anterior.classList.add("saliendo");

    const espera = movimientoReducido ? 60 : 520;

    window.setTimeout(function () {
      anterior.classList.remove("activa", "saliendo");

      destino.classList.add("activa");
      void destino.offsetWidth;         // fuerza el reflow antes de animar
      destino.classList.add("visible");

      window.scrollTo({ top: 0, behavior: "auto" });
      pantallaActual = destino;
      navegando = false;

      if (typeof alLlegar === "function") alLlegar();
    }, espera);
  }


  /* ==========================================================
     04. PANTALLA INICIAL
     ========================================================== */

  function prepararInicio() {
    const ramo = generarRamo({
      flores: CONFIG.floresInicio,
      ancho: 300,
      alto: 300,
      retardoBase: 0.45,
      retardoPaso: 0.26,
      conLazo: true,
      conDestellos: false,
      floresSecundarias: 2
    });
    $("#ramoInicial").appendChild(ramo);

    $("#botonAbrir").addEventListener("click", function () {
      iniciarMusica();
      irA(pantallas.mensaje);
    });

    $("#botonContinuar").addEventListener("click", function () {
      irA(pantallas.recuerdos, mostrarRecuerdo);
    });
  }


  /* ==========================================================
     05. RECUERDOS (FOTOS)
     ========================================================== */

  let indiceRecuerdo = 0;

  const recuerdoEl     = $("#recuerdo");
  const recuerdoFoto   = $("#recuerdoFoto");
  const recuerdoVacio  = $("#recuerdoVacio");
  const recuerdoTexto  = $("#recuerdoTexto");
  const botonSeguir    = $("#botonSeguir");
  const botonSeguirTxt = $("#botonSeguirTexto");
  const progreso       = $("#progreso");

  function prepararProgreso() {
    RECUERDOS.forEach(function () {
      const punto = document.createElement("span");
      punto.className = "progreso__punto";
      progreso.appendChild(punto);
    });
  }

  function pintarProgreso() {
    Array.prototype.forEach.call(progreso.children, function (punto, i) {
      punto.classList.toggle("activo", i === indiceRecuerdo);
    });
  }

  function mostrarRecuerdo() {
    const dato = RECUERDOS[indiceRecuerdo];

    /* Si la foto no existe todavía, se muestra un marcador bonito */
    recuerdoVacio.hidden = true;
    recuerdoFoto.hidden = false;
    recuerdoFoto.onerror = function () {
      recuerdoFoto.hidden = true;
      recuerdoVacio.hidden = false;
    };
    recuerdoFoto.src = dato.foto;
    recuerdoFoto.alt = dato.alt || "";

    recuerdoTexto.textContent = dato.texto;
    botonSeguirTxt.textContent = TEXTOS_BOTON[indiceRecuerdo] || "Seguir";

    pintarProgreso();

    recuerdoEl.classList.remove("sale", "entra");
    void recuerdoEl.offsetWidth;
    recuerdoEl.classList.add("entra");
  }

  function siguienteRecuerdo() {
    if (navegando) return;

    if (indiceRecuerdo >= RECUERDOS.length - 1) {
      irA(pantallas.final, secuenciaFinal);
      return;
    }

    navegando = true;
    recuerdoEl.classList.remove("entra");
    recuerdoEl.classList.add("sale");

    window.setTimeout(function () {
      indiceRecuerdo += 1;
      mostrarRecuerdo();
      navegando = false;
    }, movimientoReducido ? 40 : 430);
  }


  /* ==========================================================
     06. PANTALLA FINAL (SECUENCIA ORQUESTADA)
     ========================================================== */

  let secuenciaLanzada = false;
  const temporizadores = [];

  /* Bloques que aparecen uno detrás de otro en la pantalla final */
  const BLOQUES_FINALES = [
    "#finalSusurro", "#finalTitulo", "#finalTarjeta",
    "#contador", "#ramoFinal", "#botonRepetir"
  ];

  function luegoDe(ms, fn) {
    temporizadores.push(window.setTimeout(fn, movimientoReducido ? Math.min(ms, 200) : ms));
  }

  function secuenciaFinal() {
    if (secuenciaLanzada) return;
    secuenciaLanzada = true;

    const susurro = $("#finalSusurro");
    const titulo  = $("#finalTitulo");
    const tarjeta = $("#finalTarjeta");
    const contadorEl = $("#contador");
    const ramoCaja = $("#ramoFinal");
    const cierre  = $("#cierre");
    const repetir = $("#botonRepetir");

    /* 1 y 2. El mensaje aparece y termina de aparecer */
    luegoDe(200,  () => susurro.classList.add("visible"));
    luegoDe(900,  () => titulo.classList.add("visible"));
    luegoDe(1700, () => tarjeta.classList.add("visible"));
    luegoDe(2600, function () {
      if (!contadorEl.hidden) contadorEl.classList.add("visible");
    });

    /* 3 y 4. El ramo aparece y las flores se abren una por una */
    luegoDe(3000, function () {
      ramoCaja.classList.add("visible");
      const ramo = generarRamo({
        flores: CONFIG.floresFinal,
        ancho: 400,
        alto: 400,
        retardoBase: 0.25,
        retardoPaso: 0.22,
        conLazo: true,
        conDestellos: true,          /* 5. pequeños destellos */
        floresSecundarias: 6
      });
      ramoCaja.appendChild(ramo);
    });

    /* 6. Partículas amarillas más presentes */
    luegoDe(3900, () => particulas.acelerar());

    /* 7. Algunos corazones, con cuentagotas */
    luegoDe(5200, () => particulas.encenderCorazones());

    /* 8 y 9. El ramo queda meciéndose y llega la frase de cierre */
    luegoDe(6400, function () {
      cierre.classList.add("visible");
      repetir.classList.add("visible");
      cierre.scrollIntoView({ behavior: movimientoReducido ? "auto" : "smooth", block: "center" });
    });

    repetir.addEventListener("click", reiniciar, { once: true });
  }

  function reiniciar() {
    temporizadores.forEach(clearTimeout);
    temporizadores.length = 0;
    secuenciaLanzada = false;
    indiceRecuerdo = 0;

    /* Se limpia la pantalla final para poder verla otra vez */
    const ramoCaja = $("#ramoFinal");
    ramoCaja.innerHTML = "";
    $("#cierre").classList.remove("visible");
    BLOQUES_FINALES.forEach(function (sel) { $(sel).classList.remove("visible"); });

    particulas.calmar();
    irA(pantallas.inicio);
  }


  /* ==========================================================
     07. RAMO DE FLORES (SVG generado con JavaScript)
     ========================================================== */

  /**
   * Dibuja un ramo completo: tallos, hojas, flores y lazo.
   * Las flores se abren una por una gracias a animation-delay.
   */
  function generarRamo(op) {
    const ancho = op.ancho;
    const alto  = op.alto;
    const baseX = ancho / 2;
    const baseY = alto * 0.97;

    const svg = crearSVG("svg", {
      viewBox: "0 0 " + ancho + " " + alto,
      xmlns: SVG_NS,
      "aria-hidden": "true"
    });

    /* Cada ramo usa sus propios degradados, para que no choquen los IDs */
    contadorDefs += 1;
    const sfx = "-r" + contadorDefs;
    const pintura = (nombre) => "url(#" + nombre + sfx + ")";

    svg.appendChild(definiciones(sfx));

    const gruposFlor = [];
    const total = op.flores;

    /* --- Tallos y flores principales ---------------------- */
    for (let i = 0; i < total; i++) {
      const t = total === 1 ? 0.5 : i / (total - 1);      // 0 → 1 de izquierda a derecha
      const angulo = (t - 0.5) * 1.55;                    // apertura del abanico
      const alturaTallo = alto * (0.56 + Math.cos((t - 0.5) * Math.PI) * 0.16);

      const puntaX = baseX + Math.sin(angulo) * ancho * 0.40;
      const puntaY = baseY - alturaTallo;

      const grupo = crearSVG("g", { class: "tallo-grupo" });
      grupo.style.animationDelay = (i * 0.35).toFixed(2) + "s";
      grupo.style.animationDuration = (5.4 + i * 0.28).toFixed(2) + "s";

      /* Tallo con una curva suave */
      const controlX = baseX + Math.sin(angulo) * ancho * 0.16;
      const controlY = baseY - alturaTallo * 0.45;
      const tallo = crearSVG("path", {
        d: "M " + baseX + " " + baseY +
           " Q " + controlX.toFixed(1) + " " + controlY.toFixed(1) +
           " " + puntaX.toFixed(1) + " " + puntaY.toFixed(1),
        stroke: pintura("gradTallo"),
        "stroke-width": 3.4,
        "stroke-linecap": "round",
        fill: "none",
        opacity: 0.95
      });
      grupo.appendChild(tallo);

      /* Una hoja en algunos tallos */
      if (i % 2 === 0) {
        const hojaX = (baseX + puntaX) / 2;
        const hojaY = (baseY + puntaY) / 2 + 6;
        const lado = puntaX < baseX ? -1 : 1;
        const hoja = crearSVG("path", {
          class: "hoja",
          d: "M " + hojaX + " " + hojaY +
             " c " + (16 * lado) + " -12, " + (30 * lado) + " -4, " + (34 * lado) + " 8" +
             " c " + (-14 * lado) + " 6, " + (-28 * lado) + " 4, " + (-34 * lado) + " -8 z",
          fill: pintura("gradHoja")
        });
        hoja.style.animationDelay =
          (op.retardoBase + i * op.retardoPaso + 0.2).toFixed(2) + "s, " +
          (op.retardoBase + i * op.retardoPaso + 1.2).toFixed(2) + "s";
        grupo.appendChild(hoja);
      }

      /* Flor en la punta del tallo */
      const escala = 0.82 + Math.cos((t - 0.5) * Math.PI) * 0.30;
      const flor = dibujarFlor({
        x: puntaX,
        y: puntaY,
        escala: escala * (ancho / 400),
        petalos: i % 3 === 0 ? 9 : 8,
        giro: azar(0, 40),
        retardo: op.retardoBase + i * op.retardoPaso,
        pintura: pintura
      });
      grupo.appendChild(flor);
      gruposFlor.push({ x: puntaX, y: puntaY, escala: escala });

      svg.appendChild(grupo);
    }

    /* --- Florecillas secundarias -------------------------- */
    for (let j = 0; j < (op.floresSecundarias || 0); j++) {
      const ref = gruposFlor[Math.floor(azar(0, gruposFlor.length))];
      const pequeña = dibujarFlor({
        x: ref.x + azar(-34, 34),
        y: ref.y + azar(10, 52),
        escala: 0.34 * (ancho / 400),
        petalos: 6,
        giro: azar(0, 60),
        retardo: op.retardoBase + total * op.retardoPaso * 0.7 + j * 0.16,
        pintura: pintura,
        color: pintura("gradPetaloClaro")
      });
      svg.appendChild(pequeña);
    }

    /* --- Lazo y papel del ramo ---------------------------- */
    if (op.conLazo) {
      const lazo = crearSVG("g", { class: "lazo" });
      lazo.style.animationDelay = (op.retardoBase + total * op.retardoPaso + 0.1).toFixed(2) + "s";

      const e = ancho / 400;                       /* escala del remate */
      const topeY = baseY - 78 * e;

      /* Papel de envolver: dos solapas, una algo más oscura */
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX - 44 * e) + " " + topeY +
           " L " + (baseX + 2 * e) + " " + (topeY + 6 * e) +
           " L " + (baseX + 2 * e) + " " + (baseY + 4 * e) +
           " L " + (baseX - 19 * e) + " " + (baseY + 4 * e) + " Z",
        fill: pintura("gradPapel")
      }));
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX + 44 * e) + " " + topeY +
           " L " + (baseX - 2 * e) + " " + (topeY + 6 * e) +
           " L " + (baseX - 2 * e) + " " + (baseY + 4 * e) +
           " L " + (baseX + 19 * e) + " " + (baseY + 4 * e) + " Z",
        fill: pintura("gradPapelSombra")
      }));

      /* Cinta */
      lazo.appendChild(crearSVG("rect", {
        x: baseX - 27 * e, y: baseY - 46 * e,
        width: 54 * e, height: 14 * e,
        rx: 7 * e, fill: pintura("gradLazo")
      }));

      /* Colas de la cinta */
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX - 5 * e) + " " + (baseY - 33 * e) +
           " c " + (-4 * e) + " " + (12 * e) + ", " + (-12 * e) + " " + (16 * e) + ", " + (-19 * e) + " " + (19 * e) +
           " l " + (7 * e) + " " + (5 * e) +
           " c " + (7 * e) + " " + (-7 * e) + ", " + (12 * e) + " " + (-15 * e) + ", " + (14 * e) + " " + (-22 * e) + " z",
        fill: pintura("gradLazo"), opacity: 0.9
      }));
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX + 5 * e) + " " + (baseY - 33 * e) +
           " c " + (4 * e) + " " + (12 * e) + ", " + (12 * e) + " " + (16 * e) + ", " + (19 * e) + " " + (19 * e) +
           " l " + (-7 * e) + " " + (5 * e) +
           " c " + (-7 * e) + " " + (-7 * e) + ", " + (-12 * e) + " " + (-15 * e) + ", " + (-14 * e) + " " + (-22 * e) + " z",
        fill: pintura("gradLazo"), opacity: 0.9
      }));

      /* Lazadas */
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX - 4 * e) + " " + (baseY - 39 * e) +
           " c " + (-22 * e) + " " + (-19 * e) + ", " + (-42 * e) + " " + (-4 * e) + ", " + (-22 * e) + " " + (10 * e) +
           " c " + (9 * e) + " " + (6 * e) + ", " + (19 * e) + " " + (1 * e) + ", " + (22 * e) + " " + (-10 * e) + " z",
        fill: pintura("gradLazo")
      }));
      lazo.appendChild(crearSVG("path", {
        d: "M " + (baseX + 4 * e) + " " + (baseY - 39 * e) +
           " c " + (22 * e) + " " + (-19 * e) + ", " + (42 * e) + " " + (-4 * e) + ", " + (22 * e) + " " + (10 * e) +
           " c " + (-9 * e) + " " + (6 * e) + ", " + (-19 * e) + " " + (1 * e) + ", " + (-22 * e) + " " + (-10 * e) + " z",
        fill: pintura("gradLazo")
      }));

      /* Nudo */
      lazo.appendChild(crearSVG("ellipse", {
        cx: baseX, cy: baseY - 38 * e, rx: 7 * e, ry: 6 * e,
        fill: pintura("gradNudo")
      }));
      svg.appendChild(lazo);
    }

    /* --- Destellos alrededor del ramo --------------------- */
    if (op.conDestellos) {
      for (let k = 0; k < 9; k++) {
        const ref = gruposFlor[Math.floor(azar(0, gruposFlor.length))];
        const chispa = crearSVG("path", {
          class: "destello-ramo",
          d: estrella(ref.x + azar(-52, 52), ref.y + azar(-46, 34), azar(3.5, 7)),
          fill: "#FFF3C9"
        });
        chispa.style.animationDelay = azar(0.2, 3.2).toFixed(2) + "s";
        chispa.style.animationDuration = azar(2.6, 4.4).toFixed(2) + "s";
        svg.appendChild(chispa);
      }
    }

    return svg;
  }

  /** Una flor: pétalos alrededor de un corazón dorado.
      Ojo: la posición va en un grupo exterior, porque las animaciones
      CSS sobrescriben el atributo transform del SVG. */
  function dibujarFlor(op) {
    const sitio = crearSVG("g", {
      transform: "translate(" + op.x.toFixed(1) + "," + op.y.toFixed(1) + ") scale(" + op.escala.toFixed(3) + ")"
    });

    const flor = crearSVG("g", { class: "flor" });
    flor.style.animationDelay = op.retardo.toFixed(2) + "s";

    const corola = crearSVG("g", { class: "corola" });
    corola.style.animationDelay = azar(0, 2).toFixed(2) + "s";
    corola.style.animationDuration = azar(4.6, 6.4).toFixed(2) + "s";

    const petalos = op.petalos;
    for (let p = 0; p < petalos; p++) {
      const giro = (360 / petalos) * p + op.giro;
      corola.appendChild(crearSVG("ellipse", {
        cx: 0, cy: -17, rx: 7.5, ry: 17,
        fill: op.color || op.pintura("gradPetalo"),
        transform: "rotate(" + giro.toFixed(1) + ")",
        opacity: 0.96
      }));
    }

    /* Segunda corona de pétalos, más corta, para dar volumen */
    for (let p = 0; p < petalos; p++) {
      const giro = (360 / petalos) * p + op.giro + (180 / petalos);
      corola.appendChild(crearSVG("ellipse", {
        cx: 0, cy: -11, rx: 5.2, ry: 11,
        fill: op.pintura("gradPetaloClaro"),
        transform: "rotate(" + giro.toFixed(1) + ")",
        opacity: 0.85
      }));
    }

    corola.appendChild(crearSVG("circle", { cx: 0, cy: 0, r: 7.6, fill: op.pintura("gradCentro") }));
    corola.appendChild(crearSVG("circle", { cx: -2, cy: -2, r: 2.4, fill: "#FFF0BC", opacity: 0.7 }));

    flor.appendChild(corola);
    sitio.appendChild(flor);
    return sitio;
  }

  /** Pequeña estrella de cuatro puntas para los destellos. */
  function estrella(cx, cy, r) {
    const d = r * 0.28;
    return "M " + cx + " " + (cy - r) +
           " Q " + (cx + d) + " " + (cy - d) + " " + (cx + r) + " " + cy +
           " Q " + (cx + d) + " " + (cy + d) + " " + cx + " " + (cy + r) +
           " Q " + (cx - d) + " " + (cy + d) + " " + (cx - r) + " " + cy +
           " Q " + (cx - d) + " " + (cy - d) + " " + cx + " " + (cy - r) + " Z";
  }

  /** Degradados compartidos por los ramos. */
  let contadorDefs = 0;
  function definiciones(sfx) {
    const defs = crearSVG("defs", {});

    function grad(id, paradas, vertical) {
      const g = crearSVG("linearGradient", {
        id: id + sfx,
        x1: "0%", y1: vertical ? "0%" : "0%",
        x2: vertical ? "0%" : "100%", y2: vertical ? "100%" : "100%"
      });
      paradas.forEach(function (p) {
        g.appendChild(crearSVG("stop", { offset: p[0], "stop-color": p[1] }));
      });
      defs.appendChild(g);
    }

    grad("gradPetalo",       [["0%", "#FFE79E"], ["55%", "#F5C244"], ["100%", "#D9A32B"]], true);
    grad("gradPetaloClaro",  [["0%", "#FFF6DA"], ["100%", "#FFD873"]], true);
    grad("gradTallo",        [["0%", "#6F8B5C"], ["100%", "#4F6B41"]], true);
    grad("gradHoja",         [["0%", "#8AA874"], ["100%", "#587A47"]], true);
    grad("gradLazo",         [["0%", "#F7DDD2"], ["100%", "#E19583"]], false);
    grad("gradNudo",         [["0%", "#EFC4B7"], ["100%", "#D08571"]], true);
    grad("gradPapel",        [["0%", "#FFFDF6"], ["100%", "#F1DEBC"]], true);
    grad("gradPapelSombra",  [["0%", "#F7ECD6"], ["100%", "#E2C99D"]], true);

    const centro = crearSVG("radialGradient", { id: "gradCentro" + sfx });
    centro.appendChild(crearSVG("stop", { offset: "0%",   "stop-color": "#F0B93A" }));
    centro.appendChild(crearSVG("stop", { offset: "100%", "stop-color": "#A9701A" }));
    defs.appendChild(centro);

    return defs;
  }


  /* ==========================================================
     08. PARTÍCULAS Y CORAZONES
     ========================================================== */

  const particulas = (function () {
    const colores = ["#FFE08A", "#F5C244", "#FFF3C9", "#E9C87A", "#F2CFC6"];
    let idParticulas = null;
    let idCorazones = null;
    let ritmo = CONFIG.ritmoParticulasSuave;

    function nacerParticula() {
      if (document.hidden) return;

      const p = document.createElement("span");
      const esPetalo = Math.random() > 0.62;
      const tam = esPetalo ? azar(7, 13) : azar(3, 6.5);

      p.className = "particula" + (esPetalo ? " particula--petalo" : "");
      p.style.left = azar(2, 96) + "vw";
      p.style.width = tam.toFixed(1) + "px";
      p.style.height = (esPetalo ? tam * 0.75 : tam).toFixed(1) + "px";
      p.style.background = colores[Math.floor(azar(0, colores.length))];
      p.style.opacity = "0";
      p.style.setProperty("--deriva", azar(-70, 70).toFixed(0) + "px");
      p.style.setProperty("--alto", azar(45, 95).toFixed(0) + "vh");
      p.style.animationDuration = azar(7, 15).toFixed(1) + "s";
      p.style.filter = "blur(" + azar(0, 0.8).toFixed(2) + "px)";

      p.addEventListener("animationend", () => p.remove());
      capaParticulas.appendChild(p);
    }

    function nacerCorazon() {
      if (document.hidden) return;

      const c = document.createElement("span");
      c.className = "corazon";
      c.textContent = Math.random() > 0.5 ? "💛" : "🤍";
      c.style.left = azar(8, 88) + "vw";
      c.style.fontSize = azar(11, 19).toFixed(0) + "px";
      c.style.setProperty("--deriva", azar(-50, 50).toFixed(0) + "px");
      c.style.setProperty("--alto", azar(40, 70).toFixed(0) + "vh");
      c.style.animationDuration = azar(8, 13).toFixed(1) + "s";

      c.addEventListener("animationend", () => c.remove());
      capaParticulas.appendChild(c);
    }

    function reprogramar() {
      if (idParticulas) clearInterval(idParticulas);
      idParticulas = window.setInterval(nacerParticula, ritmo);
    }

    return {
      iniciar() {
        if (movimientoReducido) return;
        reprogramar();
      },
      acelerar() {
        if (movimientoReducido) return;
        ritmo = CONFIG.ritmoParticulasFinal;
        reprogramar();
        for (let i = 0; i < 6; i++) window.setTimeout(nacerParticula, i * 120);
      },
      encenderCorazones() {
        if (movimientoReducido || idCorazones) return;
        idCorazones = window.setInterval(nacerCorazon, CONFIG.ritmoCorazones);
        nacerCorazon();
      },
      calmar() {
        ritmo = CONFIG.ritmoParticulasSuave;
        reprogramar();
        if (idCorazones) { clearInterval(idCorazones); idCorazones = null; }
      }
    };
  })();


  /* ==========================================================
     09. MÚSICA
     Los navegadores móviles no dejan sonar audio sin un toque
     de la usuaria: por eso empieza al pulsar "Abrir".
     ========================================================== */

  let hayMusica = true;

  audio.addEventListener("error", function () { hayMusica = false; }, true);
  audio.querySelector("source").addEventListener("error", function () {
    hayMusica = false;
    botonMusica.hidden = true;
  });

  function pintarBotonMusica(sonando) {
    botonMusica.classList.toggle("sonando", sonando);
    botonMusica.setAttribute("aria-pressed", sonando ? "true" : "false");
    musicaTexto.textContent = sonando ? "Sonando" : "Música";
  }

  function iniciarMusica() {
    if (!hayMusica) return;

    audio.volume = 0;
    const intento = audio.play();

    if (intento && typeof intento.then === "function") {
      intento.then(function () {
        botonMusica.hidden = false;
        window.requestAnimationFrame(() => botonMusica.classList.add("visible"));
        pintarBotonMusica(true);
        subirVolumen();
      }).catch(function () {
        /* El navegador lo bloqueó: dejamos el control a la vista por si quiere activarlo */
        botonMusica.hidden = false;
        window.requestAnimationFrame(() => botonMusica.classList.add("visible"));
        pintarBotonMusica(false);
      });
    }
  }

  /* Subida de volumen progresiva: entra sin sobresaltos */
  function subirVolumen() {
    const objetivo = CONFIG.volumen;
    const paso = objetivo / 40;
    const id = window.setInterval(function () {
      if (audio.volume + paso >= objetivo) {
        audio.volume = objetivo;
        clearInterval(id);
      } else {
        audio.volume = Math.min(objetivo, audio.volume + paso);
      }
    }, 60);
  }

  botonMusica.addEventListener("click", function () {
    if (audio.paused) {
      audio.volume = CONFIG.volumen;
      audio.play().then(() => pintarBotonMusica(true)).catch(() => pintarBotonMusica(false));
    } else {
      audio.pause();
      pintarBotonMusica(false);
    }
  });


  /* ==========================================================
     10. CONTADOR DE DÍAS (opcional)
     ========================================================== */

  function prepararContador() {
    const el = $("#contador");
    const fecha = CONFIG.fechaInicio;

    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
      el.hidden = true;                 /* sin fecha configurada, no se muestra */
      return;
    }

    const unDia = 1000 * 60 * 60 * 24;
    const dias = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / unDia));

    el.innerHTML = CONFIG.textoContador.replace("{dias}", dias.toLocaleString("es-ES"));
    el.hidden = false;
  }


  /* ==========================================================
     11. PARALLAX MUY LIGERO
     Las luces del fondo siguen apenas al dedo o al ratón.
     ========================================================== */

  function prepararParallax() {
    if (movimientoReducido) return;
    const capas = document.querySelectorAll("[data-parallax]");
    if (!capas.length) return;

    let objetivoX = 0, objetivoY = 0, x = 0, y = 0;

    function mover(ev) {
      const punto = ev.touches ? ev.touches[0] : ev;
      objetivoX = punto.clientX - window.innerWidth / 2;
      objetivoY = punto.clientY - window.innerHeight / 2;
    }

    window.addEventListener("mousemove", mover, { passive: true });
    window.addEventListener("touchmove", mover, { passive: true });

    (function bucle() {
      x += (objetivoX - x) * 0.05;
      y += (objetivoY - y) * 0.05;
      capas.forEach(function (capa) {
        const f = parseFloat(capa.dataset.parallax);
        capa.style.translate = (x * f).toFixed(2) + "px " + (y * f).toFixed(2) + "px";
      });
      window.requestAnimationFrame(bucle);
    })();
  }


  /* ==========================================================
     12. ARRANQUE
     ========================================================== */

  function iniciar() {
    BLOQUES_FINALES.forEach(function (sel) { $(sel).classList.add("paso-final"); });

    prepararInicio();
    prepararProgreso();
    prepararContador();
    prepararParallax();
    particulas.iniciar();

    botonSeguir.addEventListener("click", siguienteRecuerdo);

    /* Precarga silenciosa de las fotos para que no parpadeen */
    RECUERDOS.forEach(function (r) {
      const img = new Image();
      img.src = r.foto;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

})();
