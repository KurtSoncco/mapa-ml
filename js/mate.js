'use strict';

/**
 * Solucionadores pequeños. Todo se calcula en el navegador a partir de los datos.
 */
(function () {
  function aleatorio(semilla) {
    let a = semilla >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normal(rng) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function resolver(aumentada) {
    const n = aumentada.length;
    const A = aumentada.map((fila) => fila.slice());
    for (let col = 0; col < n; col++) {
      let pivote = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivote][col])) pivote = r;
      }
      if (Math.abs(A[pivote][col]) < 1e-12) return null;
      const tmp = A[col];
      A[col] = A[pivote];
      A[pivote] = tmp;
      const div = A[col][col];
      for (let j = col; j <= n; j++) A[col][j] /= div;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = A[r][col];
        if (factor === 0) continue;
        for (let j = col; j <= n; j++) A[r][j] -= factor * A[col][j];
      }
    }
    return A.map((fila) => fila[n]);
  }

  function rectaMinimos(puntos) {
    const n = puntos.length;
    if (n < 2) return null;
    let sx = 0;
    let sy = 0;
    for (const p of puntos) {
      sx += p.x;
      sy += p.y;
    }
    const mx = sx / n;
    const my = sy / n;
    let num = 0;
    let den = 0;
    for (const p of puntos) {
      const dx = p.x - mx;
      num += dx * (p.y - my);
      den += dx * dx;
    }
    const pendiente = den < 1e-12 ? 0 : num / den;
    return { pendiente, corte: my - pendiente * mx };
  }

  function minimosQR(X, y) {
    const n = X.length;
    const p = X[0].length;
    const Q = Array.from({ length: n }, () => Array(p).fill(0));
    const R = Array.from({ length: p }, () => Array(p).fill(0));
    const cols = Array.from({ length: p }, (_, j) => X.map((fila) => fila[j]));
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < j; i++) {
        let producto = 0;
        for (let k = 0; k < n; k++) producto += cols[j][k] * Q[k][i];
        R[i][j] = producto;
        for (let k = 0; k < n; k++) cols[j][k] -= producto * Q[k][i];
      }
      let norma = 0;
      for (let k = 0; k < n; k++) norma += cols[j][k] * cols[j][k];
      norma = Math.sqrt(norma);
      R[j][j] = norma;
      if (norma < 1e-12) continue;
      for (let k = 0; k < n; k++) Q[k][j] = cols[j][k] / norma;
    }
    const qty = Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      if (R[j][j] < 1e-12) continue;
      for (let k = 0; k < n; k++) qty[j] += Q[k][j] * y[k];
    }
    const coef = Array(p).fill(0);
    for (let j = p - 1; j >= 0; j--) {
      if (Math.abs(R[j][j]) < 1e-12) continue;
      let suma = qty[j];
      for (let k = j + 1; k < p; k++) suma -= R[j][k] * coef[k];
      coef[j] = suma / R[j][j];
    }
    return coef;
  }

  function ajustePolinomico(puntos, grado) {
    const n = puntos.length;
    const orden = grado + 1;
    let min = Infinity;
    let max = -Infinity;
    for (const p of puntos) {
      if (p.x < min) min = p.x;
      if (p.x > max) max = p.x;
    }
    const ancho = max - min || 1;
    const escala = (x) => (2 * (x - min)) / ancho - 1;
    const X = puntos.map((p) => {
      const s = escala(p.x);
      const fila = new Array(orden);
      let pot = 1;
      for (let i = 0; i < orden; i++) {
        fila[i] = pot;
        pot *= s;
      }
      return fila;
    });
    const y = puntos.map((p) => p.y);
    const coef = minimosQR(X, y);
    return {
      coef,
      escala,
      evaluar(x) {
        const s = escala(x);
        let pot = 1;
        let suma = 0;
        for (let i = 0; i < coef.length; i++) {
          suma += coef[i] * pot;
          pot *= s;
        }
        return suma;
      },
    };
  }

  function estandarizar(X) {
    const n = X.length;
    const p = X[0].length;
    const media = Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) media[j] += X[i][j];
    }
    for (let j = 0; j < p; j++) media[j] /= n;
    const desv = Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        const d = X[i][j] - media[j];
        desv[j] += d * d;
      }
    }
    for (let j = 0; j < p; j++) desv[j] = Math.sqrt(desv[j] / n) || 1;
    const Z = X.map((fila) => fila.map((v, j) => (v - media[j]) / desv[j]));
    return Z;
  }

  function centrar(valores) {
    let media = 0;
    for (const v of valores) media += v;
    media /= valores.length;
    return valores.map((v) => v - media);
  }

  function columnasOrtonormales(semilla, n, p) {
    const rng = aleatorio(semilla);
    const Q = [Array(n).fill(1 / Math.sqrt(n))];
    const bases = [];
    let guardia = 0;
    while (bases.length < p && guardia < 1000) {
      guardia += 1;
      const v = Array.from({ length: n }, () => normal(rng));
      for (const q of Q) {
        let producto = 0;
        for (let i = 0; i < n; i++) producto += v[i] * q[i];
        for (let i = 0; i < n; i++) v[i] -= producto * q[i];
      }
      let norma = 0;
      for (let i = 0; i < n; i++) norma += v[i] * v[i];
      norma = Math.sqrt(norma);
      if (norma < 1e-8) continue;
      const q = v.map((x) => x / norma);
      Q.push(q);
      bases.push(q.map((x) => x * Math.sqrt(n)));
    }
    return bases[0].map((_, i) => bases.map((col) => col[i]));
  }

  function datosCreta(semilla) {
    semilla = semilla == null ? 79 : semilla;
    const n = 40;
    const reales = [1.65, -1.2, 0.85, -0.5, 0];
    const X = columnasOrtonormales(semilla, n, reales.length);
    const rng = aleatorio(semilla + 10007);
    const y = [];
    for (let i = 0; i < n; i++) {
      let objetivo = normal(rng) * 0.7;
      for (let j = 0; j < reales.length; j++) objetivo += X[i][j] * reales[j];
      y.push(objetivo);
    }
    return {
      X,
      y: centrar(y),
      nombres: ['x₁', 'x₂', 'x₃', 'x₄', 'ruido'],
      indiceRuido: 4,
    };
  }

  function cresta(X, y, alpha) {
    const n = X.length;
    const p = X[0].length;
    const A = Array.from({ length: p }, () => Array(p + 1).fill(0));
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) {
        let suma = 0;
        for (let i = 0; i < n; i++) suma += X[i][j] * X[i][k];
        A[j][k] = suma / n;
      }
      A[j][j] += alpha;
      let suma = 0;
      for (let i = 0; i < n; i++) suma += X[i][j] * y[i];
      A[j][p] = suma / n;
    }
    return resolver(A);
  }

  function datosLazo(semilla) {
    semilla = semilla == null ? 1 : semilla;
    const rng = aleatorio(semilla);
    const n = 48;
    const reales = [1.8, 0, -1.35, 0, 0.62, 0];
    const X = [];
    const y = [];
    for (let i = 0; i < n; i++) {
      const fila = reales.map(() => normal(rng));
      let objetivo = normal(rng) * 0.18;
      for (let j = 0; j < reales.length; j++) objetivo += fila[j] * reales[j];
      X.push(fila);
      y.push(objetivo);
    }
    return {
      X: estandarizar(X),
      y: centrar(y),
      nombres: ['x₁', 'x₂', 'x₃', 'x₄', 'x₅', 'x₆'],
    };
  }

  function umbralSuave(rho, alpha) {
    if (rho > alpha) return rho - alpha;
    if (rho < -alpha) return rho + alpha;
    return 0;
  }

  function lazo(X, y, alpha, iteraciones) {
    const n = X.length;
    const p = X[0].length;
    const beta = Array(p).fill(0);
    const residuo = y.slice();
    const tope = iteraciones || 500;
    for (let t = 0; t < tope; t++) {
      let cambio = 0;
      for (let j = 0; j < p; j++) {
        let rho = 0;
        let z = 0;
        const bj = beta[j];
        for (let i = 0; i < n; i++) {
          const xij = X[i][j];
          const r = residuo[i] + xij * bj;
          rho += xij * r;
          z += xij * xij;
        }
        rho /= n;
        z = z / n || 1;
        let nuevo = umbralSuave(rho, alpha) / z;
        if (Math.abs(nuevo) < 1e-10) nuevo = 0;
        const dif = nuevo - bj;
        if (dif !== 0) {
          for (let i = 0; i < n; i++) residuo[i] -= X[i][j] * dif;
          beta[j] = nuevo;
          cambio += Math.abs(dif);
        }
      }
      if (cambio < 1e-9) break;
    }
    return beta;
  }

  function alphaMaximoLazo(X, y) {
    const n = X.length;
    const p = X[0].length;
    let maximo = 0;
    for (let j = 0; j < p; j++) {
      let suma = 0;
      for (let i = 0; i < n; i++) suma += X[i][j] * y[i];
      maximo = Math.max(maximo, Math.abs(suma / n));
    }
    return maximo;
  }

  function sigmoide(z) {
    if (z > 30) return 1;
    if (z < -30) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  function entrenarLogistica(puntos, pesos, pasos, tasa) {
    const w = pesos ? pesos.slice() : [0, 0, 0];
    const n = puntos.length || 1;
    const repeticiones = pasos || 80;
    const lr = tasa || 0.65;
    for (let s = 0; s < repeticiones; s++) {
      let g0 = 0;
      let g1 = 0;
      let gb = 0;
      for (const p of puntos) {
        const pred = sigmoide(w[0] * p.x + w[1] * p.y + w[2]);
        const err = pred - p.clase;
        g0 += err * p.x;
        g1 += err * p.y;
        gb += err;
      }
      w[0] -= (lr * g0) / n;
      w[1] -= (lr * g1) / n;
      w[2] -= (lr * gb) / n;
    }
    return w;
  }

  function probabilidadLogistica(w, x, y) {
    return sigmoide(w[0] * x + w[1] * y + w[2]);
  }

  function vecinosCercanos(puntos, consulta, k) {
    const orden = puntos
      .map((p, i) => ({
        i,
        clase: p.clase,
        d: (p.x - consulta.x) ** 2 + (p.y - consulta.y) ** 2,
      }))
      .sort((a, b) => a.d - b.d || a.i - b.i);
    const cantidad = Math.max(1, Math.min(k, orden.length));
    const elegidos = orden.slice(0, cantidad);
    const conteo = [0, 0];
    for (const e of elegidos) conteo[e.clase] += 1;
    let clase = conteo[1] > conteo[0] ? 1 : 0;
    if (conteo[0] === conteo[1]) clase = elegidos[0].clase;
    return { elegidos, clase };
  }

  function gini(sub) {
    const n = sub.length;
    if (!n) return 0;
    let c1 = 0;
    for (const p of sub) if (p.clase === 1) c1 += 1;
    const p1 = c1 / n;
    const p0 = 1 - p1;
    return 1 - p0 * p0 - p1 * p1;
  }

  function mejorClase(sub) {
    let c1 = 0;
    for (const p of sub) if (p.clase === 1) c1 += 1;
    return c1 >= sub.length - c1 ? 1 : 0;
  }

  function construirArbol(puntos, profundidadMax, rng) {
    function partir(sub, profundidad) {
      const clase = mejorClase(sub);
      const puro = sub.every((p) => p.clase === clase);
      if (profundidad >= profundidadMax || puro || sub.length < 4) {
        return { hoja: true, clase };
      }
      const rasgos = rng ? [Math.floor(rng() * 2)] : [0, 1];
      let mejor = null;
      let mejorImpureza = Infinity;
      const base = gini(sub);
      for (const rasgo of rasgos) {
        const orden = sub.slice().sort((a, b) => a.x[rasgo] - b.x[rasgo]);
        for (let i = 2; i <= orden.length - 2; i++) {
          if (orden[i].x[rasgo] === orden[i - 1].x[rasgo]) continue;
          const umbral = (orden[i].x[rasgo] + orden[i - 1].x[rasgo]) / 2;
          const izq = orden.slice(0, i);
          const der = orden.slice(i);
          const imp =
            (gini(izq) * izq.length + gini(der) * der.length) / sub.length;
          if (imp < mejorImpureza - 1e-12) {
            mejorImpureza = imp;
            mejor = { rasgo, umbral, izq, der };
          }
        }
      }
      if (!mejor || mejorImpureza >= base - 1e-12) return { hoja: true, clase };
      return {
        hoja: false,
        rasgo: mejor.rasgo,
        umbral: mejor.umbral,
        clase,
        izq: partir(mejor.izq, profundidad + 1),
        der: partir(mejor.der, profundidad + 1),
      };
    }
    return partir(puntos, 0);
  }

  function predecirArbol(nodo, x, y) {
    let actual = nodo;
    while (!actual.hoja) {
      const valor = actual.rasgo === 0 ? x : y;
      actual = valor <= actual.umbral ? actual.izq : actual.der;
    }
    return actual.clase;
  }

  function regionesArbol(nodo, x0, x1, y0, y1, salida) {
    if (nodo.hoja) {
      salida.push({ x0, x1, y0, y1, clase: nodo.clase });
      return;
    }
    if (nodo.rasgo === 0) {
      regionesArbol(nodo.izq, x0, nodo.umbral, y0, y1, salida);
      regionesArbol(nodo.der, nodo.umbral, x1, y0, y1, salida);
    } else {
      regionesArbol(nodo.izq, x0, x1, y0, nodo.umbral, salida);
      regionesArbol(nodo.der, x0, x1, nodo.umbral, y1, salida);
    }
  }

  function bosque(puntos, cantidad, semilla, profundidad) {
    const rng = aleatorio(semilla);
    const arboles = [];
    const n = puntos.length;
    const prof = profundidad || 3;
    for (let t = 0; t < cantidad; t++) {
      const muestra = [];
      for (let i = 0; i < n; i++) muestra.push(puntos[Math.floor(rng() * n)]);
      arboles.push(construirArbol(muestra, prof, rng));
    }
    return arboles;
  }

  function votoBosque(arboles, x, y, cantidad) {
    const m = Math.max(1, Math.min(cantidad, arboles.length));
    let suma = 0;
    for (let i = 0; i < m; i++) suma += predecirArbol(arboles[i], x, y);
    return suma / m;
  }

  function producto(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }

  function entrenarSVM(puntos, C) {
    const n = puntos.length;
    const alpha = Array(n).fill(0);
    let b = 0;
    const tol = 1e-3;
    const cota = Math.max(C, 1e-6);
    const cache = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const k = producto(puntos[i].x, puntos[j].x);
        cache[i][j] = k;
        cache[j][i] = k;
      }
    }

    function decision(i) {
      let suma = b;
      for (let k = 0; k < n; k++) {
        if (alpha[k] === 0) continue;
        suma += alpha[k] * puntos[k].y * cache[k][i];
      }
      return suma;
    }

    let sinCambios = 0;
    let iter = 0;
    while (sinCambios < 3 && iter < 80) {
      let cambios = 0;
      for (let i = 0; i < n; i++) {
        const Ei = decision(i) - puntos[i].y;
        const yi = puntos[i].y;
        const ai = alpha[i];
        const viola =
          (yi * Ei < -tol && ai < cota - 1e-8) || (yi * Ei > tol && ai > 1e-8);
        if (!viola) continue;

        let j = -1;
        let mejor = -1;
        for (let t = 0; t < n; t++) {
          if (t === i) continue;
          const Et = decision(t) - puntos[t].y;
          const dif = Math.abs(Ei - Et);
          if (dif > mejor) {
            mejor = dif;
            j = t;
          }
        }
        if (j < 0) continue;
        const Ej = decision(j) - puntos[j].y;
        const yj = puntos[j].y;
        const aiViejo = alpha[i];
        const ajViejo = alpha[j];
        let L;
        let H;
        if (yi !== yj) {
          L = Math.max(0, ajViejo - aiViejo);
          H = Math.min(cota, cota + ajViejo - aiViejo);
        } else {
          L = Math.max(0, aiViejo + ajViejo - cota);
          H = Math.min(cota, aiViejo + ajViejo);
        }
        if (H - L < 1e-8) continue;
        const eta = 2 * cache[i][j] - cache[i][i] - cache[j][j];
        if (eta > -1e-12) continue;
        let aj = ajViejo - (yj * (Ei - Ej)) / eta;
        if (aj > H) aj = H;
        else if (aj < L) aj = L;
        if (Math.abs(aj - ajViejo) < 1e-6) continue;
        const aiNuevo = aiViejo + yi * yj * (ajViejo - aj);
        alpha[j] = aj < 1e-10 ? 0 : aj > cota - 1e-10 ? cota : aj;
        alpha[i] = aiNuevo < 1e-10 ? 0 : aiNuevo > cota - 1e-10 ? cota : aiNuevo;
        const b1 =
          b -
          Ei -
          yi * (alpha[i] - aiViejo) * cache[i][i] -
          yj * (alpha[j] - ajViejo) * cache[i][j];
        const b2 =
          b -
          Ej -
          yi * (alpha[i] - aiViejo) * cache[i][j] -
          yj * (alpha[j] - ajViejo) * cache[j][j];
        if (alpha[i] > 1e-8 && alpha[i] < cota - 1e-8) b = b1;
        else if (alpha[j] > 1e-8 && alpha[j] < cota - 1e-8) b = b2;
        else b = (b1 + b2) / 2;
        cambios += 1;
      }
      iter += 1;
      sinCambios = cambios === 0 ? sinCambios + 1 : 0;
    }

    const libres = [];
    for (let i = 0; i < n; i++) {
      if (alpha[i] > 1e-4 && alpha[i] < cota - 1e-4) libres.push(i);
    }
    const apoyo = libres.length
      ? libres
      : alpha.map((a, i) => (a > 1e-4 ? i : -1)).filter((i) => i >= 0);
    if (apoyo.length) {
      let sumaB = 0;
      for (const i of apoyo) {
        let s = 0;
        for (let k = 0; k < n; k++) {
          if (alpha[k] === 0) continue;
          s += alpha[k] * puntos[k].y * cache[k][i];
        }
        sumaB += puntos[i].y - s;
      }
      b = sumaB / apoyo.length;
    }

    let w1 = 0;
    let w2 = 0;
    for (let i = 0; i < n; i++) {
      w1 += alpha[i] * puntos[i].y * puntos[i].x[0];
      w2 += alpha[i] * puntos[i].y * puntos[i].x[1];
    }
    return { alpha, b, w: [w1, w2], C: cota };
  }

  function decisionSVM(modelo, x, y) {
    return modelo.w[0] * x + modelo.w[1] * y + modelo.b;
  }

  function densidadNormal(x, media, varianza) {
    const v = Math.max(varianza, 1e-6);
    const z = x - media;
    return Math.exp((-0.5 * z * z) / v) / Math.sqrt(2 * Math.PI * v);
  }

  function ajustarBayes(grupos) {
    const total = grupos.reduce((s, g) => s + g.puntos.length, 0) || 1;
    return grupos.map((g) => {
      const n = g.puntos.length || 1;
      let mx = 0;
      let my = 0;
      for (const p of g.puntos) {
        mx += p.x;
        my += p.y;
      }
      mx /= n;
      my /= n;
      let vx = 0;
      let vy = 0;
      for (const p of g.puntos) {
        vx += (p.x - mx) ** 2;
        vy += (p.y - my) ** 2;
      }
      return {
        clase: g.clase,
        media: [mx, my],
        varianza: [Math.max(vx / n, 0.04), Math.max(vy / n, 0.04)],
        prior: n / total,
      };
    });
  }

  function evaluarBayes(modelo, x, y) {
    const detalle = modelo.map((clase) => {
      const lx = densidadNormal(x, clase.media[0], clase.varianza[0]);
      const ly = densidadNormal(y, clase.media[1], clase.varianza[1]);
      const logPosterior =
        Math.log(clase.prior) + Math.log(lx) + Math.log(ly);
      return { clase: clase.clase, lx, ly, logPosterior };
    });
    let ganadora = detalle[0];
    for (const d of detalle) {
      if (d.logPosterior > ganadora.logPosterior) ganadora = d;
    }
    return { detalle, clase: ganadora.clase };
  }

  function kmedias(puntos, k, previos, semilla) {
    const n = puntos.length;
    const grupos = Math.max(1, Math.min(k, n));
    const rng = aleatorio(semilla);
    let centros;
    if (previos && previos.length === grupos) {
      centros = previos.map((c) => ({ x: c.x, y: c.y }));
    } else {
      const primero = Math.floor(rng() * n);
      centros = [{ x: puntos[primero].x, y: puntos[primero].y }];
      while (centros.length < grupos) {
        const dist = puntos.map((p) => {
          let m = Infinity;
          for (const c of centros) {
            const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
            if (d < m) m = d;
          }
          return m;
        });
        let suma = 0;
        for (const d of dist) suma += d;
        if (suma < 1e-12) {
          const p = puntos[centros.length % n];
          centros.push({ x: p.x, y: p.y });
          continue;
        }
        let r = rng() * suma;
        let idx = dist.length - 1;
        for (let i = 0; i < dist.length; i++) {
          r -= dist[i];
          if (r <= 0) {
            idx = i;
            break;
          }
        }
        centros.push({ x: puntos[idx].x, y: puntos[idx].y });
      }
    }

    const asignacion = Array(n).fill(0);
    for (let iter = 0; iter < 30; iter++) {
      let cambio = false;
      for (let i = 0; i < n; i++) {
        let mejor = 0;
        let md = Infinity;
        for (let c = 0; c < centros.length; c++) {
          const d = (puntos[i].x - centros[c].x) ** 2 + (puntos[i].y - centros[c].y) ** 2;
          if (d < md) {
            md = d;
            mejor = c;
          }
        }
        if (asignacion[i] !== mejor) cambio = true;
        asignacion[i] = mejor;
      }
      const sumas = centros.map(() => ({ x: 0, y: 0, n: 0 }));
      for (let i = 0; i < n; i++) {
        const c = asignacion[i];
        sumas[c].x += puntos[i].x;
        sumas[c].y += puntos[i].y;
        sumas[c].n += 1;
      }
      for (let c = 0; c < centros.length; c++) {
        if (sumas[c].n > 0) {
          centros[c] = { x: sumas[c].x / sumas[c].n, y: sumas[c].y / sumas[c].n };
        }
      }
      if (!cambio) break;
    }
    return { asignacion, centros };
  }

  function dbscan(puntos, epsilon, minPuntos) {
    const n = puntos.length;
    const etiqueta = Array(n).fill(undefined);
    const eps2 = epsilon * epsilon;
    function region(i) {
      const vecinos = [];
      const pi = puntos[i];
      for (let j = 0; j < n; j++) {
        const dx = pi.x - puntos[j].x;
        const dy = pi.y - puntos[j].y;
        if (dx * dx + dy * dy <= eps2) vecinos.push(j);
      }
      return vecinos;
    }
    let cluster = 0;
    for (let i = 0; i < n; i++) {
      if (etiqueta[i] !== undefined) continue;
      const vecinos = region(i);
      if (vecinos.length < minPuntos) {
        etiqueta[i] = -1;
        continue;
      }
      etiqueta[i] = cluster;
      const cola = vecinos.filter((j) => j !== i);
      const enCola = new Set(cola);
      enCola.add(i);
      while (cola.length) {
        const j = cola.pop();
        if (etiqueta[j] === -1) etiqueta[j] = cluster;
        if (etiqueta[j] !== undefined) continue;
        etiqueta[j] = cluster;
        const vecinos2 = region(j);
        if (vecinos2.length >= minPuntos) {
          for (const k of vecinos2) {
            if (!enCola.has(k)) {
              enCola.add(k);
              cola.push(k);
            }
          }
        }
      }
      cluster += 1;
    }
    return etiqueta;
  }

  function acp(puntos) {
    const n = puntos.length || 1;
    let mx = 0;
    let my = 0;
    for (const p of puntos) {
      mx += p.x;
      my += p.y;
    }
    mx /= n;
    my /= n;
    let a = 0;
    let b = 0;
    let c = 0;
    for (const p of puntos) {
      const dx = p.x - mx;
      const dy = p.y - my;
      a += dx * dx;
      b += dx * dy;
      c += dy * dy;
    }
    a /= n;
    b /= n;
    c /= n;
    const traza = a + c;
    const det = a * c - b * b;
    const raiz = Math.sqrt(Math.max(0, (traza / 2) ** 2 - det));
    const l1 = traza / 2 + raiz;
    const l2 = Math.max(0, traza / 2 - raiz);
    let vx;
    let vy;
    if (Math.abs(b) > 1e-12) {
      vx = b;
      vy = l1 - a;
    } else if (a >= c) {
      vx = 1;
      vy = 0;
    } else {
      vx = 0;
      vy = 1;
    }
    const norma = Math.hypot(vx, vy) || 1;
    vx /= norma;
    vy /= norma;
    const suma = l1 + l2;
    return {
      media: { x: mx, y: my },
      eje: { x: vx, y: vy },
      eje2: { x: -vy, y: vx },
      varianza: l1,
      varianza2: l2,
      parte: suma > 0 ? l1 / suma : 1,
    };
  }

  function perceptron(puntos, pesos, sesgo, pasos) {
    const w = pesos ? pesos.slice() : [0, 0];
    let b = sesgo || 0;
    const tope = pasos || 40;
    for (let epoca = 0; epoca < tope; epoca++) {
      let errores = 0;
      for (const p of puntos) {
        const margen = p.etiqueta * (w[0] * p.x + w[1] * p.y + b);
        if (margen <= 1e-9) {
          w[0] += p.etiqueta * p.x;
          w[1] += p.etiqueta * p.y;
          b += p.etiqueta;
          errores += 1;
        }
      }
      if (errores === 0) break;
    }
    return { w, b };
  }

  function nubeClases(semilla, dispersion) {
    const rng = aleatorio(semilla);
    const sigma = dispersion == null ? 0.55 : dispersion;
    const centros = [
      { x: 2.15, y: 2.2, clase: 0 },
      { x: 7.85, y: 7.7, clase: 0 },
      { x: 2.25, y: 7.65, clase: 1 },
      { x: 7.75, y: 2.35, clase: 1 },
    ];
    const puntos = [];
    for (const c of centros) {
      for (let i = 0; i < 11; i++) {
        puntos.push({
          x: [c.x + normal(rng) * sigma, c.y + normal(rng) * sigma],
          clase: c.clase,
        });
      }
    }
    return puntos;
  }

  function puntosPolinomio() {
    const xs = [-3, -2.45, -1.9, -1.35, -0.8, -0.25, 0.35, 0.9, 1.5, 2.05, 2.55, 3];
    return xs.map((x) => ({
      x,
      y: 0.11 * x ** 3 - 0.85 * x + 0.42 * Math.sin(2.1 * x),
    }));
  }

  function puntosLinealesIniciales() {
    return [
      { x: 1, y: 1.35 },
      { x: 1.7, y: 2.15 },
      { x: 2.55, y: 2.35 },
      { x: 3.35, y: 3.95 },
      { x: 4.25, y: 4.25 },
      { x: 5.15, y: 5.55 },
    ];
  }

  function blob(rng, n, mx, my, sx, sy, extra) {
    const puntos = [];
    for (let i = 0; i < n; i++) {
      puntos.push(Object.assign({ x: mx + normal(rng) * sx, y: my + normal(rng) * sy }, extra));
    }
    return puntos;
  }

  function datosLogistica() {
    const rng = aleatorio(11);
    return blob(rng, 14, -1.35, -0.45, 0.38, 0.42, { clase: 0 }).concat(
      blob(rng, 14, 1.25, 0.55, 0.38, 0.42, { clase: 1 })
    );
  }

  function datosVecinos() {
    const rng = aleatorio(19);
    return blob(rng, 16, -1.3, -0.2, 0.55, 0.5, { clase: 0 })
      .concat(blob(rng, 16, 1.15, 0.35, 0.55, 0.5, { clase: 1 }))
      .concat([
        { x: -0.15, y: 0.95, clase: 1 },
        { x: 0.35, y: -0.85, clase: 0 },
        { x: -0.45, y: 0.15, clase: 0 },
        { x: 0.2, y: 0.25, clase: 1 },
      ]);
  }

  function datosSVM() {
    const rng = aleatorio(23);
    const positivos = blob(rng, 9, -1.25, -0.35, 0.34, 0.38, {}).map((p) => ({
      x: [p.x, p.y],
      y: 1,
    }));
    const negativos = blob(rng, 9, 1.2, 0.45, 0.34, 0.38, {}).map((p) => ({
      x: [p.x, p.y],
      y: -1,
    }));
    return positivos.concat(negativos, [
      { x: [-0.15, 0.55], y: 1 },
      { x: [0.25, -0.35], y: -1 },
    ]);
  }

  function datosBayes() {
    const rng = aleatorio(29);
    const a = blob(rng, 28, -1.25, 0.35, 0.38, 0.85, { clase: 0 });
    const b = blob(rng, 28, 1.15, -0.15, 0.9, 0.36, { clase: 1 });
    return { puntos: a.concat(b), grupos: [{ clase: 0, puntos: a }, { clase: 1, puntos: b }] };
  }

  function datosKmedias() {
    const rng = aleatorio(31);
    return blob(rng, 10, -1.6, -1.1, 0.28, 0.28, {})
      .concat(blob(rng, 10, 1.5, -0.9, 0.28, 0.28, {}))
      .concat(blob(rng, 10, 0.1, 1.45, 0.28, 0.28, {}));
  }

  function datosDbscan() {
    const rng = aleatorio(37);
    const grupos = blob(rng, 12, -1.7, -0.4, 0.16, 0.16, {})
      .concat(blob(rng, 12, 1.45, -0.2, 0.16, 0.16, {}))
      .concat(blob(rng, 11, -0.1, 1.5, 0.16, 0.16, {}));
    const ruido = [
      { x: 0.1, y: -1.55 },
      { x: 2.15, y: 1.35 },
      { x: -2.2, y: 1.15 },
      { x: 0.85, y: 0.55 },
      { x: -0.95, y: -1.7 },
      { x: 1.7, y: -1.65 },
    ];
    return grupos.concat(ruido);
  }

  function datosAcp(semilla) {
    const rng = aleatorio(semilla || 41);
    const base = [];
    for (let i = 0; i < 70; i++) {
      base.push({ x: normal(rng) * 2.15, y: normal(rng) * 0.42 });
    }
    return base;
  }

  function rotarPunto(p, angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return { x: c * p.x - s * p.y, y: s * p.x + c * p.y };
  }

  function datosPerceptron() {
    const rng = aleatorio(43);
    return blob(rng, 8, -1.35, 0.15, 0.28, 0.32, { etiqueta: 1 }).concat(
      blob(rng, 8, 1.3, -0.1, 0.28, 0.32, { etiqueta: -1 })
    );
  }

  const Mate = {
    aleatorio,
    normal,
    resolver,
    rectaMinimos,
    ajustePolinomico,
    datosCreta,
    cresta,
    datosLazo,
    lazo,
    alphaMaximoLazo,
    entrenarLogistica,
    probabilidadLogistica,
    vecinosCercanos,
    construirArbol,
    predecirArbol,
    regionesArbol,
    bosque,
    votoBosque,
    nubeClases,
    entrenarSVM,
    decisionSVM,
    ajustarBayes,
    evaluarBayes,
    kmedias,
    dbscan,
    acp,
    perceptron,
    puntosPolinomio,
    puntosLinealesIniciales,
    datosLogistica,
    datosVecinos,
    datosSVM,
    datosBayes,
    datosKmedias,
    datosDbscan,
    datosAcp,
    rotarPunto,
    datosPerceptron,
  };

  globalThis.Mate = Mate;
})();
