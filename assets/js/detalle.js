// NEWS POLI - Vista Detalle: lee ?id= (o ?slug=) y pinta la noticia desde noticiaas.json.
(() => {
  'use strict';

  const CONFIG = {
    dataUrl: '../assets/data/noticias.json',
    favoritesKey: 'newsPoliFavorites',
    detailBaseUrl: './detalle.html',
    relatedCount: 3,
    toastDuration: 2600
  };

  const $ = selector => document.querySelector(selector);
  let favorites = new Set();
  let toastTimer;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindNav();
    favorites = readFavorites();

    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('id'));
    const slug = params.get('slug');

    try {
      const response = await fetch(CONFIG.dataUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new TypeError('El JSON debe ser un arreglo.');

      const news = data.sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
      const item = news.find(n => Number(n.id) === id) || (slug && news.find(n => n.slug === slug));

      if (!item) {
        showStatus('No encontramos la noticia solicitada.', true);
        return;
      }
      renderDetail(item);
      renderRelated(news, item);
    } catch (error) {
      console.error('[NEWS POLI] No fue posible cargar el detalle:', error);
      showStatus('No fue posible cargar la noticia. Abre el proyecto con Live Server (http://), no con file://.', true);
    }
  }

  function showStatus(message, withLink) {
    const status = $('#np-detail-status');
    status.textContent = message + ' ';
    if (withLink) {
      const link = document.createElement('a');
      link.href = 'noticias.html';
      link.textContent = 'Volver al listado';
      status.append(link);
    }
  }

  function renderDetail(item) {
    document.title = `${item.titulo} | NEWS POLI`;
    $('#np-detail-meta').textContent = [item.categoria, item.fecha].filter(Boolean).join(' · ');
    $('#np-detail-title').textContent = item.titulo;
    $('#np-detail-author').textContent = item.autor ? `Por ${item.autor}` : '';

    const image = $('#np-detail-image');
    image.src = item.imagen;
    image.alt = item.alt || item.titulo;

    // Cuerpo: descripción como entradilla + contenido (o vista previa si no hay contenido).
    const body = $('#np-detail-text');
    body.textContent = '';
    const paragraphs = [item.descripcion, ...(Array.isArray(item.contenido) && item.contenido.length ? item.contenido : [item.vistaPrevia])];
    paragraphs.filter(Boolean).forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      body.append(p);
    });

    const id = Number(item.id);
    syncFavorite(id, item.titulo);
    const toggle = () => {
      if (favorites.has(id)) {
        favorites.delete(id);
        showToast('Noticia eliminada de favoritos.');
      } else {
        favorites.add(id);
        showToast('Noticia agregada a favoritos.');
      }
      persistFavorites();
      syncFavorite(id, item.titulo);
    };
    $('#np-detail-fav').addEventListener('click', toggle);
    $('#np-detail-fav-text').addEventListener('click', toggle);

    $('#np-detail-status').hidden = true;
    $('#np-detail').hidden = false;
  }

  function syncFavorite(id, title) {
    const active = favorites.has(id);
    const label = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
    const icon = $('#np-detail-fav');
    const text = $('#np-detail-fav-text');
    icon.classList.toggle('is-favorite', active);
    icon.setAttribute('aria-pressed', String(active));
    icon.setAttribute('aria-label', `${label}: ${title}`);
    text.classList.toggle('is-favorite', active);
    text.setAttribute('aria-pressed', String(active));
    text.textContent = label;
  }

  function renderRelated(news, current) {
    const others = news.filter(n => n.id !== current.id);
    const sameCategory = others.filter(n => n.categoria === current.categoria);
    const list = [...sameCategory, ...others.filter(n => !sameCategory.includes(n))].slice(0, CONFIG.relatedCount);
    if (!list.length) return;

    const grid = $('#np-detail-related-grid');
    grid.textContent = '';
    list.forEach(n => {
      const link = document.createElement('a');
      link.className = 'np-news-card np-detail-related';
      link.href = `${CONFIG.detailBaseUrl}?id=${encodeURIComponent(n.id)}&slug=${encodeURIComponent(n.slug || '')}`;

      const media = document.createElement('div');
      media.className = 'np-detail-related__media';
      const img = document.createElement('img');
      img.src = n.imagen;
      img.alt = n.alt || n.titulo;
      img.loading = 'lazy';
      media.append(img);

      const meta = document.createElement('p');
      meta.className = 'np-news-meta';
      meta.textContent = n.categoria;

      const title = document.createElement('h3');
      title.className = 'np-detail-related__title';
      title.textContent = n.titulo;

      link.append(media, meta, title);
      grid.append(link);
    });
    $('#np-detail-related').hidden = false;
  }

  function bindNav() {
    const toggle = $('.np-nav-toggle');
    const nav = $('#np-main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.favoritesKey) || '[]');
      return new Set(Array.isArray(stored) ? stored.map(Number).filter(Number.isFinite) : []);
    } catch (error) {
      return new Set();
    }
  }

  function persistFavorites() {
    try {
      localStorage.setItem(CONFIG.favoritesKey, JSON.stringify([...favorites]));
    } catch (error) {
      console.warn('[NEWS POLI] No se pudieron guardar favoritos:', error);
    }
  }

  function showToast(message) {
    const toast = $('#np-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), CONFIG.toastDuration);
  }
})();
