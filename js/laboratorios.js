'use strict';

const COLORES = {
  tinta: '#231e18',
  papel: '#f7f1e4',
  c0: '#1c6b58',
  c1: '#c24d26',
  ruido: '#b3aa9e',
  paleta: ['#1c6b58', '#c24d26', '#234e70', '#a56d14', '#72364e', '#3f6a3a'],
};

function medir(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function fondo(ctx, w, h) {
  ctx.fillStyle = COLORES.papel;
  ctx.fillRect(0, 0, w, h);
}

function num(n, d) {
  if (!Number.isFinite(n) || Math.abs(n) < 1e-10) return '0';
  return n.toFixed(d).replace('.', ',');
}

function control(cont, opts, fn, signal) {
  const div = document.createElement('div');
  div.className = 'control';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(opts.valor);
  input.setAttribute('aria-label', opts.etiqueta);
  const val = document.createElement('span');
  val.className = 'valor';
  const pintar = () => {
    const v = Number(input.value);
    val.textContent = opts.texto ? opts.texto(v) : String(v);
  };
  pintar();
  input.addEventListener('input', () => {
    pintar();
    fn(Number(input.value));
  }, { signal });
  div.append(input, val);
  cont.append(div);
  return input;
}

function vista(w, h, x0, x1, y0, y1, pad) {
  const l = pad;
  const t = pad;
  const r = w - pad;
  const b = h - pad;
  const aw = Math.max(1, r - l);
  const ah = Math.max(1, b - t);
  return {
    x0, x1, y0, y1,
    interno: { l, t, r, b },
    aPixel(x, y) {
      return {
        px: l + ((x - x0) / (x1 - x0)) * aw,
        py: b - ((y - y0) / (y1 - y0)) * ah,
      };
    },
    aDato(px, py) {
      return {
        x: x0 + ((px - l) / aw) * (x1 - x0),
        y: y0 + ((b - py) / ah) * (y1 - y0),
      };
    },
  };
}

function local(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function observar(canvas, dibujar) {
  const obs = new ResizeObserver(() => dibujar());
  obs.observe(canvas);
  return obs;
}

function marca(ctx, x, y, clase, r) {
  ctx.beginPath();
  ctx.fillStyle = clase ? COLORES.c1 : COLORES.c0;
  ctx.strokeStyle = '#f7f1e4';
  ctx.lineWidth = 1.5;
  if (clase) ctx.rect(x - r, y - r, r * 2, r * 2);
  else ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function grilla(ctx, v) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.interno.l, v.interno.t, v.interno.r - v.interno.l, v.interno.b - v.interno.t);
  ctx.clip();
  ctx.strokeStyle = 'rgba(35,30,24,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / 6;
    const a = v.aPixel(x, v.y0);
    const b = v.aPixel(x, v.y1);
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const y = v.y0 + ((v.y1 - v.y0) * i) / 5;
    const a = v.aPixel(v.x0, y);
    const b = v.aPixel(v.x1, y);
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }
  ctx.restore();
}

function dentro(x, y, x0, x1, y0, y1) {
  return x >= x0 - 1e-6 && x <= x1 + 1e-6 && y >= y0 - 1e-6 && y <= y1 + 1e-6;
}

function unicos(pts) {
  const u = [];
  for (const p of pts) {
    if (!u.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-4)) u.push(p);
  }
  return u.length >= 2 ? [u[0], u[1]] : null;
}

function recortarRecta(m, b, x0, x1, y0, y1) {
  const pts = [];
  for (const x of [x0, x1]) {
    const y = m * x + b;
    if (dentro(x, y, x0, x1, y0, y1)) pts.push({ x, y });
  }
  if (Math.abs(m) > 1e-9) {
    for (const y of [y0, y1]) {
      const x = (y - b) / m;
      if (dentro(x, y, x0, x1, y0, y1)) pts.push({ x, y });
    }
  }
  return unicos(pts);
}

function lineaNivel(w1, w2, b, nivel, x0, x1, y0, y1) {
  const pts = [];
  if (Math.abs(w2) > 1e-9) {
    for (const x of [x0, x1]) {
      const y = (nivel - w1 * x - b) / w2;
      if (dentro(x, y, x0, x1, y0, y1)) pts.push({ x, y });
    }
  }
  if (Math.abs(w1) > 1e-9) {
    for (const y of [y0, y1]) {
      const x = (nivel - w2 * y - b) / w1;
      if (dentro(x, y, x0, x1, y0, y1)) pts.push({ x, y });
    }
  }
  return unicos(pts);
}

function trazo(ctx, v, a, b) {
  const p = v.aPixel(a.x, a.y);
  const q = v.aPixel(b.x, b.y);
  ctx.beginPath();
  ctx.moveTo(p.px, p.py);
  ctx.lineTo(q.px, q.py);
  ctx.stroke();
}

function fuente(ctx, peso, tam) {
  ctx.font = peso + ' ' + tam + 'px "Liberation Serif", "DejaVu Serif", Georgia, serif';
}

function mezcla(p) {
  const a = [28, 107, 88];
  const b = [194, 77, 38];
  const u = Math.min(1, Math.max(0, p));
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return 'rgba(' + r + ',' + g + ',' + bl + ',0.42)';
}

function celda(ctx, v, pintar) {
  const tam = 7;
  const box = v.interno;
  for (let y = box.t; y < box.b; y += tam) {
    for (let x = box.l; x < box.r; x += tam) {
      const d = v.aDato(x + tam / 2, y + tam / 2);
      const color = pintar(d.x, d.y);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, tam + 0.5, tam + 0.5);
    }
  }
}

const Laboratorios = [
  {
    id: 'lineal',
    titulo: 'Regresión lineal',
    frase: 'Haz clic para poner puntos y mira cómo la recta se ajusta al instante.',
    rama: 'regresion',
    montar(canvas) {
      const abort = new AbortController();
      const signal = abort.signal;
      const puntos = Mate.puntosLinealesIniciales().map((p) => ({ x: p.x, y: p.y }));
      const caja = { x0: 0.2, x1: 6.2, y0: 0.2, y1: 6.8 };
      let arrastre = null;
      canvas.style.cursor = 'crosshair';

      function ampliar(p) {
        const mx = (caja.x1 - caja.x0) * 0.12;
        const my = (caja.y1 - caja.y0) * 0.12;
        if (p.x < caja.x0 + mx) caja.x0 = p.x - mx;
        if (p.x > caja.x1 - mx) caja.x1 = p.x + mx;
        if (p.y < caja.y0 + my) caja.y0 = p.y - my;
        if (p.y > caja.y1 - my) caja.y1 = p.y + my;
      }

      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        grilla(ctx, v);
        const recta = Mate.rectaMinimos(puntos);
        if (recta) {
          const seg = recortarRecta(recta.pendiente, recta.corte, v.x0, v.x1, v.y0, v.y1);
          if (seg) {
            ctx.strokeStyle = COLORES.tinta;
            ctx.lineWidth = 2.5;
            trazo(ctx, v, seg[0], seg[1]);
          }
        }
        puntos.forEach((p, i) => {
          const q = v.aPixel(p.x, p.y);
          ctx.beginPath();
          ctx.fillStyle = '#c24d26';
          ctx.arc(q.px, q.py, arrastre && arrastre.idx === i ? 9 : 7, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      function hit(px, py) {
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        let mejor = -1;
        let md = 18 * 18;
        puntos.forEach((p, i) => {
          const q = v.aPixel(p.x, p.y);
          const d = (q.px - px) ** 2 + (q.py - py) ** 2;
          if (d <= md) {
            md = d;
            mejor = i;
          }
        });
        return mejor;
      }

      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const p = local(canvas, e);
        const idx = hit(p.x, p.y);
        if (idx >= 0) {
          arrastre = { idx, id: e.pointerId };
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = 'grabbing';
        } else {
          const { w, h } = medir(canvas);
          const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
          const d = v.aDato(p.x, p.y);
          puntos.push(d);
          ampliar(d);
          dibujar();
        }
      }, { signal });
      canvas.addEventListener('pointermove', (e) => {
        const p = local(canvas, e);
        if (!arrastre || e.pointerId !== arrastre.id) {
          canvas.style.cursor = hit(p.x, p.y) >= 0 ? 'grab' : 'crosshair';
          return;
        }
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        const d = v.aDato(p.x, p.y);
        puntos[arrastre.idx].x = d.x;
        puntos[arrastre.idx].y = d.y;
        ampliar(d);
        dibujar();
      }, { signal });
      canvas.addEventListener('pointerup', () => {
        arrastre = null;
        canvas.style.cursor = 'crosshair';
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); } };
    },
  },
  {
    id: 'polinomica',
    titulo: 'Regresión polinómica',
    frase: 'Mueve el grado y mira cómo la curva persigue cada punto.',
    rama: 'regresion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const puntos = Mate.puntosPolinomio();
      let grado = 1;
      canvas.style.cursor = 'default';
      control(controles, { min: 1, max: 6, step: 1, valor: 1, etiqueta: 'Grado' }, (v) => {
        grado = v;
        dibujar();
      }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, -3.6, 3.6, -2.5, 2.5, 18);
        grilla(ctx, v);
        const aj = Mate.ajustePolinomico(puntos, grado);
        ctx.save();
        ctx.beginPath();
        ctx.rect(v.interno.l, v.interno.t, v.interno.r - v.interno.l, v.interno.b - v.interno.t);
        ctx.clip();
        ctx.beginPath();
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 2.5;
        for (let i = 0; i <= 120; i++) {
          const x = -3.5 + (7 * i) / 120;
          const q = v.aPixel(x, aj.evaluar(x));
          if (i === 0) ctx.moveTo(q.px, q.py);
          else ctx.lineTo(q.px, q.py);
        }
        ctx.stroke();
        ctx.restore();
        for (const p of puntos) {
          const q = v.aPixel(p.x, p.y);
          ctx.beginPath();
          ctx.fillStyle = '#c24d26';
          ctx.arc(q.px, q.py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'ridge',
    titulo: 'Ridge',
    frase: 'Sube la penalización y mira cómo los pesos se encogen sin llegar a cero.',
    rama: 'regresion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const datos = Mate.datosCreta();
      const base = Mate.cresta(datos.X, datos.y, 0);
      const tope = Math.max(...base.map((v) => Math.abs(v)), 1);
      let alpha = 0;
      canvas.style.cursor = 'default';
      control(controles, {
        min: 0, max: 8, step: 0.05, valor: 0, etiqueta: 'Penalización',
        texto: (v) => num(v, 2),
      }, (v) => { alpha = v; dibujar(); }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const pesos = Mate.cresta(datos.X, datos.y, alpha);
        const n = pesos.length;
        const baseY = h * 0.56;
        const amplitud = Math.min(baseY - 36, h - 58 - baseY);
        const escala = (amplitud * 0.9) / tope;
        ctx.strokeStyle = 'rgba(35,30,24,0.35)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(28, baseY);
        ctx.lineTo(w - 20, baseY);
        ctx.stroke();
        const hueco = w / (n + 0.4);
        fuente(ctx, '600', 14);
        ctx.textAlign = 'center';
        pesos.forEach((peso, i) => {
          const cx = hueco * (i + 0.9);
          const alto = peso * escala;
          const arriba = Math.min(baseY, baseY - alto);
          const bh = Math.max(Math.abs(alto), 1.5);
          const bw = Math.min(42, hueco * 0.46);
          const x = cx - bw / 2;
          if (i === datos.indiceRuido) {
            ctx.save();
            ctx.strokeStyle = '#c24d26';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x, arriba, bw, bh);
            ctx.restore();
          } else {
            ctx.fillStyle = '#c24d26';
            ctx.fillRect(x, arriba, bw, bh);
          }
          ctx.fillStyle = COLORES.tinta;
          ctx.fillText(num(peso, 2), cx, alto >= 0 ? arriba - 8 : arriba + bh + 16);
          ctx.fillStyle = i === datos.indiceRuido ? '#8a5a32' : COLORES.tinta;
          ctx.fillText(datos.nombres[i], cx, h - 18);
        });
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'lasso',
    titulo: 'Lasso',
    frase: 'Sube la penalización y mira cómo algunos pesos caen exactamente a cero.',
    rama: 'regresion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const datos = Mate.datosLazo();
      const base = Mate.lazo(datos.X, datos.y, 0);
      const tope = Math.max(...base.map((v) => Math.abs(v)), 0.5);
      const amax = Mate.alphaMaximoLazo(datos.X, datos.y) * 0.75;
      let alpha = 0;
      canvas.style.cursor = 'default';
      control(controles, {
        min: 0, max: Math.round(amax * 1000) / 1000, step: Math.round(amax * 5) / 1000 || 0.01,
        valor: 0, etiqueta: 'Penalización', texto: (v) => num(v, 2),
      }, (v) => { alpha = v; dibujar(); }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const pesos = Mate.lazo(datos.X, datos.y, alpha);
        const n = pesos.length;
        const eje = w * 0.48;
        const escala = (w * 0.28) / tope;
        ctx.strokeStyle = 'rgba(35,30,24,0.4)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(eje, 16);
        ctx.lineTo(eje, h - 16);
        ctx.stroke();
        fuente(ctx, '600', 16);
        pesos.forEach((peso, i) => {
          const cy = 28 + ((h - 48) * (i + 0.5)) / n;
          ctx.textAlign = 'left';
          ctx.fillStyle = peso === 0 ? 'rgba(35,30,24,0.4)' : COLORES.tinta;
          ctx.fillText(datos.nombres[i], 16, cy + 5);
          const x1 = eje + peso * escala;
          if (peso === 0) {
            ctx.beginPath();
            ctx.lineWidth = 1.75;
            ctx.strokeStyle = 'rgba(35,30,24,0.35)';
            ctx.arc(eje, cy, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.textAlign = 'left';
            ctx.fillText('0', eje + 16, cy + 5);
          } else {
            ctx.strokeStyle = COLORES.tinta;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(eje, cy);
            ctx.lineTo(x1, cy);
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = peso > 0 ? '#c24d26' : '#234e70';
            ctx.arc(x1, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COLORES.tinta;
            ctx.textAlign = peso > 0 ? 'left' : 'right';
            ctx.fillText(num(peso, 2), x1 + (peso > 0 ? 12 : -12), cy + 5);
          }
        });
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'logistica',
    titulo: 'Regresión logística',
    frase: 'Clic izquierdo añade una clase y clic derecho la otra; mira la frontera moverse.',
    rama: 'clasificacion',
    montar(canvas) {
      const abort = new AbortController();
      const signal = abort.signal;
      const puntos = Mate.datosLogistica();
      let pesos = Mate.entrenarLogistica(puntos, null, 160, 0.8);
      const caja = { x0: -3, x1: 3, y0: -2.6, y1: 2.6 };
      canvas.style.cursor = 'crosshair';
      let inicio = 0;

      function agregar(e, clase) {
        const p = local(canvas, e);
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 12);
        puntos.push(Object.assign(v.aDato(p.x, p.y), { clase }));
        pesos = Mate.entrenarLogistica(puntos, pesos, 70, 0.55);
        dibujar();
      }

      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 12);
        celda(ctx, v, (x, y) => mezcla(Mate.probabilidadLogistica(pesos, x, y)));
        const borde = lineaNivel(pesos[0], pesos[1], pesos[2], 0, v.x0, v.x1, v.y0, v.y1);
        if (borde) {
          ctx.strokeStyle = COLORES.tinta;
          ctx.lineWidth = 2.5;
          trazo(ctx, v, borde[0], borde[1]);
        }
        for (const p of puntos) {
          const q = v.aPixel(p.x, p.y);
          marca(ctx, q.px, q.py, p.clase, 6);
        }
      }

      canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button === 2) {
          e.preventDefault();
          agregar(e, 1);
          return;
        }
        if (e.button === 0) inicio = performance.now();
      }, { signal });
      canvas.addEventListener('pointerup', (e) => {
        if (e.button !== 0) return;
        agregar(e, performance.now() - inicio > 480 ? 1 : 0);
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); } };
    },
  },
  {
    id: 'vecinos',
    titulo: 'K vecinos',
    frase: 'Haz clic en el mapa y mira qué vecinos votan la clase.',
    rama: 'clasificacion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const signal = abort.signal;
      const puntos = Mate.datosVecinos();
      let k = 5;
      let consulta = { x: 0.05, y: 0.1 };
      const caja = { x0: -3.1, x1: 3.1, y0: -2.6, y1: 2.6 };
      canvas.style.cursor = 'crosshair';
      control(controles, { min: 1, max: 11, step: 1, valor: 5, etiqueta: 'Vecinos' }, (v) => {
        k = v;
        dibujar();
      }, signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        grilla(ctx, v);
        const res = Mate.vecinosCercanos(puntos, consulta, k);
        const q = v.aPixel(consulta.x, consulta.y);
        ctx.lineWidth = 1.5;
        for (const e of res.elegidos) {
          const p = puntos[e.i];
          const s = v.aPixel(p.x, p.y);
          ctx.strokeStyle = p.clase ? COLORES.c1 : COLORES.c0;
          ctx.beginPath();
          ctx.moveTo(q.px, q.py);
          ctx.lineTo(s.px, s.py);
          ctx.stroke();
        }
        for (const p of puntos) {
          const s = v.aPixel(p.x, p.y);
          const activo = res.elegidos.some((e) => e.i === puntos.indexOf(p));
          marca(ctx, s.px, s.py, p.clase, activo ? 8 : 5);
        }
        ctx.beginPath();
        ctx.fillStyle = res.clase ? COLORES.c1 : COLORES.c0;
        ctx.arc(q.px, q.py, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = COLORES.tinta;
        ctx.stroke();
      }
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const p = local(canvas, e);
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        consulta = v.aDato(p.x, p.y);
        dibujar();
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'arbol',
    titulo: 'Árbol de decisión',
    frase: 'Mueve la profundidad y mira los cortes rectos partir el plano.',
    rama: 'clasificacion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const puntos = Mate.nubeClases(7, 0.48);
      let profundidad = 1;
      canvas.style.cursor = 'default';
      control(controles, { min: 1, max: 4, step: 1, valor: 1, etiqueta: 'Profundidad' }, (v) => {
        profundidad = v;
        dibujar();
      }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, 0, 10, 0, 10, 14);
        const arbol = Mate.construirArbol(puntos, profundidad, null);
        const regiones = [];
        Mate.regionesArbol(arbol, 0, 10, 0, 10, regiones);
        for (const reg of regiones) {
          const a = v.aPixel(reg.x0, reg.y1);
          const b = v.aPixel(reg.x1, reg.y0);
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = reg.clase ? COLORES.c1 : COLORES.c0;
          ctx.fillRect(a.px, a.py, b.px - a.px, b.py - a.py);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(35,30,24,0.55)';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(a.px, a.py, b.px - a.px, b.py - a.py);
        }
        for (const p of puntos) {
          const q = v.aPixel(p.x[0], p.x[1]);
          marca(ctx, q.px, q.py, p.clase, 5);
        }
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'bosque',
    titulo: 'Bosque aleatorio',
    frase: 'Suma árboles y mira cómo la frontera deja de ser un solo corte.',
    rama: 'clasificacion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const puntos = Mate.nubeClases(7, 0.48);
      const arboles = Mate.bosque(puntos, 21, 20261020, 3);
      let cantidad = 1;
      canvas.style.cursor = 'default';
      control(controles, { min: 1, max: 21, step: 1, valor: 1, etiqueta: 'Árboles' }, (v) => {
        cantidad = v;
        dibujar();
      }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, 0, 10, 0, 10, 14);
        celda(ctx, v, (x, y) => mezcla(Mate.votoBosque(arboles, x, y, cantidad)));
        for (const p of puntos) {
          const q = v.aPixel(p.x[0], p.x[1]);
          marca(ctx, q.px, q.py, p.clase, 5);
        }
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'svm',
    titulo: 'SVM',
    frase: 'Mueve la holgura y mira qué puntos sujetan el margen.',
    rama: 'clasificacion',
    montar(canvas, controles) {
      const abort = new AbortController();
      const puntos = Mate.datosSVM();
      const caja = { x0: -3, x1: 3, y0: -2.6, y1: 2.6 };
      function desde(t) {
        return Math.exp(Math.log(0.05) + (t / 100) * (Math.log(12) - Math.log(0.05)));
      }
      let C = desde(55);
      let modelo = Mate.entrenarSVM(puntos, C);
      canvas.style.cursor = 'default';
      control(controles, {
        min: 0, max: 100, step: 1, valor: 55, etiqueta: 'C',
        texto: (t) => num(desde(t), 2),
      }, (t) => {
        C = desde(t);
        modelo = Mate.entrenarSVM(puntos, C);
        dibujar();
      }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 14);
        grilla(ctx, v);
        celda(ctx, v, (x, y) => (Math.abs(Mate.decisionSVM(modelo, x, y)) <= 1 ? 'rgba(28,107,88,0.16)' : null));
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(35,30,24,0.55)';
        ctx.setLineDash([6, 5]);
        for (const nivel of [1, -1]) {
          const seg = lineaNivel(modelo.w[0], modelo.w[1], modelo.b, nivel, v.x0, v.x1, v.y0, v.y1);
          if (seg) trazo(ctx, v, seg[0], seg[1]);
        }
        ctx.setLineDash([]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = COLORES.tinta;
        const centro = lineaNivel(modelo.w[0], modelo.w[1], modelo.b, 0, v.x0, v.x1, v.y0, v.y1);
        if (centro) trazo(ctx, v, centro[0], centro[1]);
        puntos.forEach((p, i) => {
          const q = v.aPixel(p.x[0], p.x[1]);
          const clase = p.y === 1 ? 0 : 1;
          marca(ctx, q.px, q.py, clase, 6);
          if (modelo.alpha[i] > 1e-3) {
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = COLORES.tinta;
            ctx.arc(q.px, q.py, 11, 0, Math.PI * 2);
            ctx.stroke();
            if (modelo.alpha[i] >= modelo.C * 0.98) {
              ctx.beginPath();
              ctx.arc(q.px, q.py, 15, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        });
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'bayes',
    titulo: 'Naive Bayes',
    frase: 'Haz clic en un punto y mira qué variable lo empuja a cada clase.',
    rama: 'clasificacion',
    montar(canvas) {
      const abort = new AbortController();
      const signal = abort.signal;
      const datos = Mate.datosBayes();
      const modelo = Mate.ajustarBayes(datos.grupos);
      let prueba = { x: 0.05, y: 0.2 };
      canvas.style.cursor = 'crosshair';
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const corte = Math.round(h * 0.66);
        const v = vista(w, corte, -3.3, 3.3, -2.8, 2.8, 14);
        grilla(ctx, v);
        for (const p of datos.puntos) {
          const q = v.aPixel(p.x, p.y);
          marca(ctx, q.px, q.py, p.clase, 4);
        }
        const ev = Mate.evaluarBayes(modelo, prueba.x, prueba.y);
        const q = v.aPixel(prueba.x, prueba.y);
        ctx.beginPath();
        ctx.fillStyle = ev.clase ? COLORES.c1 : COLORES.c0;
        ctx.arc(q.px, q.py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = COLORES.tinta;
        ctx.stroke();
        const grupos = [
          { nombre: 'x', a: ev.detalle[0].lx, b: ev.detalle[1].lx },
          { nombre: 'y', a: ev.detalle[0].ly, b: ev.detalle[1].ly },
        ];
        const base = corte + 18;
        const altoZona = h - base - 16;
        const ancho = (w - 48) / 2;
        fuente(ctx, '600', 16);
        grupos.forEach((g, i) => {
          const x0 = 20 + i * (ancho + 8);
          const max = Math.max(g.a, g.b, 1e-9);
          ctx.fillStyle = COLORES.tinta;
          ctx.textAlign = 'left';
          ctx.fillText(g.nombre, x0, base + 4);
          const bw = Math.min(36, ancho * 0.22);
          const ha = (g.a / max) * (altoZona - 28);
          const hb = (g.b / max) * (altoZona - 28);
          const suelo = h - 16;
          ctx.fillStyle = COLORES.c0;
          ctx.fillRect(x0 + ancho * 0.28, suelo - ha, bw, ha);
          ctx.fillStyle = COLORES.c1;
          ctx.fillRect(x0 + ancho * 0.28 + bw + 10, suelo - hb, bw, hb);
        });
      }
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const p = local(canvas, e);
        const { w, h } = medir(canvas);
        const corte = Math.round(h * 0.66);
        if (p.y > corte) return;
        const v = vista(w, corte, -3.3, 3.3, -2.8, 2.8, 14);
        prueba = v.aDato(p.x, p.y);
        dibujar();
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); } };
    },
  },
  {
    id: 'kmedias',
    titulo: 'K-Means',
    frase: 'Haz clic para poner puntos y mueve K para ver cómo se parten los grupos.',
    rama: 'nosup',
    montar(canvas, controles) {
      const abort = new AbortController();
      const signal = abort.signal;
      const puntos = Mate.datosKmedias();
      const caja = { x0: -2.8, x1: 2.8, y0: -2.4, y1: 2.6 };
      let k = 3;
      let centros = null;
      canvas.style.cursor = 'crosshair';
      function ajustar(reiniciar) {
        const res = Mate.kmedias(puntos, k, reiniciar ? null : centros, 11 + k);
        centros = res.centros;
        return res;
      }
      let res = ajustar(true);
      control(controles, { min: 2, max: 5, step: 1, valor: 3, etiqueta: 'Grupos' }, (v) => {
        k = v;
        res = ajustar(true);
        dibujar();
      }, signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        grilla(ctx, v);
        puntos.forEach((p, i) => {
          const q = v.aPixel(p.x, p.y);
          ctx.beginPath();
          ctx.fillStyle = COLORES.paleta[res.asignacion[i] % COLORES.paleta.length];
          ctx.arc(q.px, q.py, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        res.centros.forEach((c, i) => {
          const q = v.aPixel(c.x, c.y);
          ctx.strokeStyle = COLORES.tinta;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(q.px - 9, q.py);
          ctx.lineTo(q.px + 9, q.py);
          ctx.moveTo(q.px, q.py - 9);
          ctx.lineTo(q.px, q.py + 9);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = COLORES.paleta[i % COLORES.paleta.length];
          ctx.arc(q.px, q.py, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const p = local(canvas, e);
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        const d = v.aDato(p.x, p.y);
        puntos.push(d);
        const mx = 0.3;
        if (d.x < caja.x0 + mx) caja.x0 = d.x - mx;
        if (d.x > caja.x1 - mx) caja.x1 = d.x + mx;
        if (d.y < caja.y0 + mx) caja.y0 = d.y - mx;
        if (d.y > caja.y1 - mx) caja.y1 = d.y + mx;
        res = ajustar(false);
        dibujar();
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'dbscan',
    titulo: 'DBSCAN',
    frase: 'Mueve el radio y mira qué puntos se quedan como ruido.',
    rama: 'nosup',
    montar(canvas, controles) {
      const abort = new AbortController();
      const puntos = Mate.datosDbscan();
      let radio = 0.5;
      canvas.style.cursor = 'default';
      control(controles, {
        min: 0.22, max: 1.7, step: 0.02, valor: 0.5, etiqueta: 'Radio',
        texto: (v) => num(v, 2),
      }, (v) => { radio = v; dibujar(); }, abort.signal);
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, -2.9, 2.9, -2.5, 2.5, 16);
        grilla(ctx, v);
        const et = Mate.dbscan(puntos, radio, 4);
        const eps2 = radio * radio;
        ctx.strokeStyle = 'rgba(35,30,24,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < puntos.length; i++) {
          if (et[i] < 0) continue;
          for (let j = i + 1; j < puntos.length; j++) {
            if (et[j] < 0) continue;
            const dx = puntos[i].x - puntos[j].x;
            const dy = puntos[i].y - puntos[j].y;
            if (dx * dx + dy * dy > eps2) continue;
            const a = v.aPixel(puntos[i].x, puntos[i].y);
            const b = v.aPixel(puntos[j].x, puntos[j].y);
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
        puntos.forEach((p, i) => {
          const q = v.aPixel(p.x, p.y);
          if (et[i] < 0) {
            ctx.fillStyle = COLORES.ruido;
            ctx.beginPath();
            ctx.arc(q.px, q.py, 5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = COLORES.paleta[et[i] % COLORES.paleta.length];
            ctx.beginPath();
            ctx.arc(q.px, q.py, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); }, foco: true };
    },
  },
  {
    id: 'pca',
    titulo: 'PCA',
    frase: 'Arrastra para rotar la nube y mira el eje que conserva más dispersión.',
    rama: 'nosup',
    montar(canvas) {
      const abort = new AbortController();
      const signal = abort.signal;
      const base = Mate.datosAcp(41);
      let angulo = 0.7;
      let ultimo = null;
      canvas.style.cursor = 'grab';
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const puntos = base.map((p) => Mate.rotarPunto(p, angulo));
        const v = vista(w, h, -5.2, 5.2, -5.2, 5.2, 16);
        grilla(ctx, v);
        const info = Mate.acp(puntos);
        for (const p of puntos) {
          const q = v.aPixel(p.x, p.y);
          ctx.fillStyle = 'rgba(35,30,24,0.75)';
          ctx.beginPath();
          ctx.arc(q.px, q.py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(v.interno.l, v.interno.t, v.interno.r - v.interno.l, v.interno.b - v.interno.t);
        ctx.clip();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(35,30,24,0.35)';
        ctx.setLineDash([5, 4]);
        trazo(ctx, v,
          { x: info.media.x - info.eje2.x * 6, y: info.media.y - info.eje2.y * 6 },
          { x: info.media.x + info.eje2.x * 6, y: info.media.y + info.eje2.y * 6 });
        ctx.setLineDash([]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#a56d14';
        trazo(ctx, v,
          { x: info.media.x - info.eje.x * 8, y: info.media.y - info.eje.y * 8 },
          { x: info.media.x + info.eje.x * 8, y: info.media.y + info.eje.y * 8 });
        ctx.restore();
        const texto = Math.round(info.parte * 100) + ' %';
        fuente(ctx, '700', 28);
        ctx.textAlign = 'left';
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLORES.papel;
        ctx.strokeText(texto, 22, 42);
        ctx.fillStyle = '#a56d14';
        ctx.fillText(texto, 22, 42);
      }
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        ultimo = { x: e.clientX, id: e.pointerId };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
      }, { signal });
      canvas.addEventListener('pointermove', (e) => {
        if (!ultimo || e.pointerId !== ultimo.id) return;
        angulo += (e.clientX - ultimo.x) * 0.008;
        ultimo.x = e.clientX;
        dibujar();
      }, { signal });
      canvas.addEventListener('pointerup', () => {
        ultimo = null;
        canvas.style.cursor = 'grab';
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); } };
    },
  },
  {
    id: 'perceptron',
    titulo: 'Perceptrón',
    frase: 'Añade un punto mal puesto y mira la frontera corregirse.',
    rama: 'redes',
    montar(canvas) {
      const abort = new AbortController();
      const signal = abort.signal;
      const puntos = Mate.datosPerceptron();
      let modelo = Mate.perceptron(puntos, [0, 0], 0, 60);
      let ultimo = null;
      const caja = { x0: -3.1, x1: 3.1, y0: -2.6, y1: 2.6 };
      canvas.style.cursor = 'crosshair';
      function dibujar() {
        const { ctx, w, h } = medir(canvas);
        fondo(ctx, w, h);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        grilla(ctx, v);
        const borde = lineaNivel(modelo.w[0], modelo.w[1], modelo.b, 0, v.x0, v.x1, v.y0, v.y1);
        if (borde) {
          ctx.strokeStyle = '#72364e';
          ctx.lineWidth = 2.5;
          trazo(ctx, v, borde[0], borde[1]);
        }
        puntos.forEach((p) => {
          const q = v.aPixel(p.x, p.y);
          marca(ctx, q.px, q.py, p.etiqueta === 1 ? 0 : 1, 6);
        });
        if (ultimo) {
          const q = v.aPixel(ultimo.x, ultimo.y);
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = COLORES.tinta;
          ctx.arc(q.px, q.py, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const p = local(canvas, e);
        const { w, h } = medir(canvas);
        const v = vista(w, h, caja.x0, caja.x1, caja.y0, caja.y1, 16);
        const d = v.aDato(p.x, p.y);
        const pred = modelo.w[0] * d.x + modelo.w[1] * d.y + modelo.b;
        const etiqueta = pred >= 0 ? -1 : 1;
        const punto = { x: d.x, y: d.y, etiqueta };
        puntos.push(punto);
        ultimo = punto;
        modelo = Mate.perceptron(puntos, modelo.w, modelo.b, 50);
        dibujar();
      }, { signal });
      const obs = observar(canvas, dibujar);
      dibujar();
      return { destruir() { abort.abort(); obs.disconnect(); } };
    },
  },
];
