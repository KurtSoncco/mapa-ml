'use strict';

const seccionMapa = document.getElementById('mapa');
const seccionLab = document.getElementById('laboratorio');
const titulo = document.getElementById('titulo');
const frase = document.getElementById('frase');
const canvas = document.getElementById('lienzo');
const controles = document.getElementById('controles');
const volver = document.getElementById('volver');

let activo = null;
let idAbierto = null;

function labPorId(id) {
  return Laboratorios.find((lab) => lab.id === id) || null;
}

function abrir(id) {
  const lab = labPorId(id);
  if (!lab || idAbierto === id) return;
  cerrar(true);
  idAbierto = id;
  titulo.textContent = lab.titulo;
  frase.textContent = lab.frase;
  seccionLab.dataset.rama = lab.rama;
  seccionLab.hidden = false;
  seccionMapa.hidden = true;
  document.title = lab.titulo;
  controles.replaceChildren();
  activo = lab.montar(canvas, controles);
  const rango = controles.querySelector('input');
  if (rango) rango.focus();
  if (location.hash !== '#' + id) location.hash = id;
}

function cerrar(silencioso) {
  if (activo) {
    activo.destruir();
    activo = null;
  }
  idAbierto = null;
  if (!silencioso) {
    seccionLab.hidden = true;
    seccionMapa.hidden = false;
    document.title = 'Mapa de modelos';
    controles.replaceChildren();
    if (location.hash) location.hash = '';
    dibujarMapa(abrir);
  }
}

volver.addEventListener('click', () => cerrar(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && idAbierto) cerrar(false);
});
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!id) {
    if (idAbierto) cerrar(false);
    return;
  }
  if (id !== idAbierto && labPorId(id)) abrir(id);
});

let reloj = 0;
window.addEventListener('resize', () => {
  clearTimeout(reloj);
  reloj = setTimeout(() => {
    if (!seccionMapa.hidden) dibujarMapa(abrir);
  }, 120);
});

function arrancar() {
  dibujarMapa(abrir);
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (labPorId(id)) abrir(id);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}
