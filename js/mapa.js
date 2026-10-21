'use strict';

const RAMAS = [
  { id: 'regresion', nombre: 'Regresión' },
  { id: 'clasificacion', nombre: 'Clasificación' },
  { id: 'nosup', nombre: 'No supervisado' },
  { id: 'redes', nombre: 'Redes neuronales' },
];

function colorRama(id) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue('--' + id).trim();
  return valor || '#231e18';
}

function arbolDeDatos() {
  return {
    nombre: 'Modelos',
    hijos: RAMAS.map((rama) => ({
      nombre: rama.nombre,
      rama: rama.id,
      hijos: Laboratorios.filter((lab) => lab.rama === rama.id).map((lab) => ({
        nombre: lab.titulo,
        id: lab.id,
        rama: lab.rama,
      })),
    })),
  };
}

function dibujarRespaldo(contenedor, alElegir) {
  contenedor.replaceChildren();
  for (const rama of arbolDeDatos().hijos) {
    const seccion = document.createElement('section');
    seccion.className = 'rama';
    seccion.style.setProperty('--rama', colorRama(rama.rama));
    const titulo = document.createElement('h2');
    titulo.textContent = rama.nombre;
    const hojas = document.createElement('div');
    hojas.className = 'hojas';
    for (const hoja of rama.hijos) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = hoja.nombre;
      boton.addEventListener('click', () => alElegir(hoja.id));
      hojas.append(boton);
    }
    seccion.append(titulo, hojas);
    contenedor.append(seccion);
  }
}

function dibujarMapa(alElegir) {
  const lienzo = document.getElementById('lienzo-mapa');
  const respaldo = document.getElementById('respaldo');
  const listo = typeof d3 !== 'undefined' && d3.tree && d3.hierarchy;
  if (!listo) {
    lienzo.hidden = true;
    respaldo.hidden = false;
    dibujarRespaldo(respaldo, alElegir);
    return;
  }
  try {
    respaldo.hidden = true;
    lienzo.hidden = false;
    lienzo.replaceChildren();
    const datos = arbolDeDatos();
    const raiz = d3.hierarchy(datos, (d) => d.hijos);
    d3.tree().nodeSize([52, 250])(raiz);
    const svg = d3.select(lienzo).append('svg');
    const enlace = d3.linkHorizontal().x((d) => d.y).y((d) => d.x);
    const g = svg.append('g');
    g.append('g')
      .selectAll('path')
      .data(raiz.links())
      .join('path')
      .attr('d', enlace)
      .attr('fill', 'none')
      .attr('stroke', (d) => colorRama((d.target.data.rama) || 'regresion'))
      .attr('stroke-width', 1.8)
      .attr('stroke-opacity', 0.75);
    const nodos = g.selectAll('g.nodo')
      .data(raiz.descendants())
      .join('g')
      .attr('class', (d) => (d.data.id ? 'nodo nodo-hoja' : 'nodo'))
      .attr('transform', (d) => 'translate(' + d.y + ',' + d.x + ')');
    nodos.each(function (d) {
      const grupo = d3.select(this);
      const color = d.depth === 0 ? '#231e18' : colorRama(d.data.rama);
      const hoja = Boolean(d.data.id);
      const texto = grupo.append('text')
        .text(d.data.nombre)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', '"Liberation Serif", "DejaVu Serif", Georgia, serif')
        .attr('font-size', hoja ? 17 : 19)
        .attr('font-weight', hoja ? 500 : 700)
        .attr('fill', d.depth === 0 ? '#faf6ee' : color);
      const caja = texto.node().getBBox();
      grupo.insert('rect', 'text')
        .attr('x', caja.x - 12)
        .attr('y', caja.y - 8)
        .attr('width', caja.width + 24)
        .attr('height', caja.height + 16)
        .attr('rx', 999)
        .attr('fill', d.depth === 0 ? '#231e18' : '#faf6ee')
        .attr('stroke', hoja ? color : 'none')
        .attr('stroke-width', hoja ? 1.7 : 0);
      if (hoja) {
        grupo
          .attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', d.data.nombre)
          .style('--rama', color)
          .on('click', () => alElegir(d.data.id))
          .on('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              alElegir(d.data.id);
            }
          });
      }
    });
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    nodos.each(function (d) {
      const caja = this.getBBox();
      minX = Math.min(minX, d.y + caja.x);
      maxX = Math.max(maxX, d.y + caja.x + caja.width);
      minY = Math.min(minY, d.x + caja.y);
      maxY = Math.max(maxY, d.x + caja.y + caja.height);
    });
    const pad = 18;
    const ancho = maxX - minX + pad * 2;
    const alto = maxY - minY + pad * 2;
    svg.attr('width', ancho).attr('height', alto)
      .attr('viewBox', (minX - pad) + ' ' + (minY - pad) + ' ' + ancho + ' ' + alto);
  } catch (error) {
    lienzo.hidden = true;
    respaldo.hidden = false;
    dibujarRespaldo(respaldo, alElegir);
  }
}
