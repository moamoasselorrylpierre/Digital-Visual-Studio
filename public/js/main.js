/* ============================================================
   DIGITAL VISUAL STUDIO — JavaScript de la page d'accueil
   - Menu mobile, header, animations
   - Chargement dynamique des services et réalisations (API)
   - Lightbox portfolio, canvas "constellation" du hero
============================================================ */

/* ---------- Contenus de secours (si l'API est indisponible,
   par ex. en ouvrant le fichier localement ou sur Netlify) ---------- */
const FALLBACK_SERVICES = [
  {
    title: 'Web Design',
    description: 'Conception et développement de sites web modernes : nous optimisons et modernisons votre présence en ligne.',
    icon: 'fa-solid fa-laptop-code',
  },
  {
    title: 'Design Graphique',
    description: 'Logos, illustrations, flyers, supports marketing et identité visuelle complète pour votre marque.',
    icon: 'fa-solid fa-pen-nib',
  },
  {
    title: 'Marketing Digital',
    description: 'Stratégie de marque, campagnes sur les réseaux sociaux et marketing digital sur mesure.',
    icon: 'fa-solid fa-bullhorn',
  },
];

const FALLBACK_PROJECTS = [
  { title: 'Création graphique', category: 'Design', image_url: 'images/portfolio/portfolio-4.png' },
];

/* ---------- Menu burger ---------- */
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

burgerBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  burgerBtn.classList.toggle('open', open);
  burgerBtn.setAttribute('aria-expanded', open);
});
mobileMenu.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burgerBtn.classList.remove('open');
  })
);

/* ---------- Ombre du header au scroll ---------- */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
});

/* ---------- Année du footer ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Services (dynamique) ---------- */
async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  let services = FALLBACK_SERVICES;
  try {
    const res = await fetch('/api/services');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) services = data;
    }
  } catch (_) { /* API indisponible : contenu de secours */ }

  grid.innerHTML = services
    .map(
      (s) => `
      <div class="service-card reveal">
        <div class="service-icon"><i class="${escapeHtml(s.icon || 'fa-solid fa-star')}"></i></div>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.description)}</p>
      </div>`
    )
    .join('');
  observeReveals(grid);
}

/* ---------- Portfolio (dynamique) ---------- */
async function loadProjects() {
  const grid = document.getElementById('portfolioGrid');
  let projects = FALLBACK_PROJECTS;
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) projects = data;
    }
  } catch (_) { /* API indisponible : contenu de secours */ }

  if (!projects.length) {
    grid.innerHTML = '<p class="portfolio-empty">De nouvelles réalisations arrivent bientôt — revenez vite !</p>';
    return;
  }

  grid.innerHTML = projects
    .map(
      (p, i) => `
      <div class="portfolio-item reveal" data-index="${i}">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <div class="overlay">
          <i class="fas fa-expand zoom"></i>
          <div class="cat">${escapeHtml(p.category || 'Création')}</div>
          <div class="title">${escapeHtml(p.title)}</div>
        </div>
      </div>`
    )
    .join('');

  grid.querySelectorAll('.portfolio-item').forEach((item) => {
    item.addEventListener('click', () => {
      const p = projects[Number(item.dataset.index)];
      openLightbox(p.image_url, p.title);
    });
  });
  observeReveals(grid);
}

/* ---------- Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

function openLightbox(src, caption) {
  lightboxImg.src = src;
  lightboxCaption.textContent = caption || '';
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

/* ---------- Révélation au scroll ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
function observeReveals(root = document) {
  root.querySelectorAll('.reveal:not(.visible)').forEach((el) => revealObserver.observe(el));
}
observeReveals();

/* ---------- Compteurs animés (section chiffres) ---------- */
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    statsObserver.unobserve(entry.target);
    const el = entry.target;
    const target = Number(el.dataset.count);
    const duration = 1400;
    const start = performance.now();
    (function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + '+';
      if (progress < 1) requestAnimationFrame(tick);
    })(start);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-value').forEach((el) => statsObserver.observe(el));

/* ---------- Canvas constellation (hero, colonne droite) ---------- */
const canvas = document.getElementById('networkCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  function initNodes() {
    nodes = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 1,
    }));
  }
  resize();
  initNodes();
  window.addEventListener('resize', () => { resize(); initNodes(); });

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.strokeStyle = `rgba(184,160,106,${1 - d / 100})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    nodes.forEach((n) => {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    requestAnimationFrame(draw);
  })();
}

/* ---------- Utilitaire anti-injection ---------- */
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* ---------- Lancement ---------- */
loadServices();
loadProjects();
