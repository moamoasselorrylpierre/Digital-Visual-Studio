/* ============================================================
   DIGITAL VISUAL STUDIO — JavaScript de l'espace administrateur
   Connexion, gestion des réalisations (upload + suppression)
   et des services (ajout / modification / suppression).
============================================================ */

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const toast = document.getElementById('toast');

/* ============================================================
   SESSION
============================================================ */
async function checkSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.authenticated) showDashboard();
  } catch (_) {
    showToast("Impossible de joindre le serveur. Le site est-il bien déployé sur Cloudflare ?", 'error');
  }
}

function showDashboard() {
  loginScreen.hidden = true;
  loginScreen.style.display = 'none';
  dashboard.hidden = false;
  loadAdminProjects();
  loadAdminServices();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  btn.disabled = true;
  errorEl.textContent = '';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    const data = await res.json();
    if (res.ok) {
      showDashboard();
    } else {
      errorEl.textContent = data.error || 'Erreur de connexion.';
    }
  } catch (_) {
    errorEl.textContent = 'Serveur injoignable. Réessayez plus tard.';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
});

/* ============================================================
   ONGLETS
============================================================ */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
    document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
  });
});

/* ============================================================
   RÉALISATIONS
============================================================ */
const projectImage = document.getElementById('projectImage');
const projectPreview = document.getElementById('projectPreview');

projectImage.addEventListener('change', () => {
  const file = projectImage.files[0];
  if (file) {
    projectPreview.src = URL.createObjectURL(file);
    projectPreview.hidden = false;
  } else {
    projectPreview.hidden = true;
  }
});

/**
 * Compresse l'image côté navigateur si elle est lourde :
 * redimensionne à 1920 px max et convertit en WebP (~85 %).
 * Les images < 1,5 Mo sont envoyées telles quelles.
 */
async function prepareImage(file) {
  if (file.size < 1.5 * 1024 * 1024 || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch (_) {
    return file; // en cas d'échec, on envoie l'original
  }
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('projectSubmit');
  const file = projectImage.files[0];
  if (!file) return showToast('Choisissez une image.', 'error');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publication en cours…';
  try {
    const optimized = await prepareImage(file);
    const form = new FormData();
    form.append('image', optimized);
    form.append('title', document.getElementById('projectTitle').value);
    form.append('category', document.getElementById('projectCategory').value);
    form.append('description', document.getElementById('projectDescription').value);

    const res = await fetch('/api/admin/projects', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la publication.');

    showToast('Réalisation publiée ! Elle est maintenant visible sur le site.', 'success');
    e.target.reset();
    projectPreview.hidden = true;
    loadAdminProjects();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publier la réalisation';
  }
});

async function loadAdminProjects() {
  const grid = document.getElementById('adminProjects');
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    if (!projects.length) {
      grid.innerHTML = '<p class="loading">Aucune réalisation publiée pour le moment. Ajoutez-en une ci-dessus !</p>';
      return;
    }
    grid.innerHTML = projects
      .map(
        (p) => `
        <div class="admin-project">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" />
          <div class="admin-project-body">
            <div class="cat">${escapeHtml(p.category || 'Création')}</div>
            <div class="title">${escapeHtml(p.title)}</div>
          </div>
          <div class="admin-project-actions">
            <button class="delete" data-id="${p.id}"><i class="fa-solid fa-trash"></i> Supprimer</button>
          </div>
        </div>`
      )
      .join('');

    grid.querySelectorAll('.delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer définitivement cette réalisation ?')) return;
        const res = await fetch(`/api/admin/projects/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Réalisation supprimée.', 'success');
          loadAdminProjects();
        } else {
          showToast('Erreur lors de la suppression.', 'error');
        }
      });
    });
  } catch (_) {
    grid.innerHTML = '<p class="loading">Impossible de charger les réalisations.</p>';
  }
}

/* ============================================================
   SERVICES
============================================================ */
const serviceForm = document.getElementById('serviceForm');
const serviceIdInput = document.getElementById('serviceId');
const serviceCancel = document.getElementById('serviceCancel');

serviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = serviceIdInput.value;
  const payload = {
    title: document.getElementById('serviceTitle').value,
    description: document.getElementById('serviceDescription').value,
    icon: document.getElementById('serviceIcon').value,
  };
  const url = id ? `/api/admin/services/${id}` : '/api/admin/services';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de l’enregistrement.');
    showToast(id ? 'Service modifié.' : 'Service ajouté ! Il est maintenant visible sur le site.', 'success');
    resetServiceForm();
    loadAdminServices();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

serviceCancel.addEventListener('click', resetServiceForm);

function resetServiceForm() {
  serviceForm.reset();
  serviceIdInput.value = '';
  serviceCancel.hidden = true;
  document.getElementById('serviceFormTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter un service';
  document.getElementById('serviceSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer le service';
}

async function loadAdminServices() {
  const list = document.getElementById('adminServices');
  try {
    const res = await fetch('/api/services');
    const services = await res.json();
    if (!services.length) {
      list.innerHTML = '<p class="loading">Aucun service pour le moment. Ajoutez-en un ci-dessus !</p>';
      return;
    }
    list.innerHTML = services
      .map(
        (s) => `
        <div class="admin-service">
          <div class="icon"><i class="${escapeHtml(s.icon)}"></i></div>
          <div class="body">
            <div class="title">${escapeHtml(s.title)}</div>
            <div class="desc">${escapeHtml(s.description)}</div>
          </div>
          <div class="actions">
            <button class="edit" data-id="${s.id}" title="Modifier"><i class="fa-solid fa-pen"></i></button>
            <button class="delete" data-id="${s.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`
      )
      .join('');

    list.querySelectorAll('.edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = services.find((x) => x.id === Number(btn.dataset.id));
        serviceIdInput.value = s.id;
        document.getElementById('serviceTitle').value = s.title;
        document.getElementById('serviceDescription').value = s.description;
        document.getElementById('serviceIcon').value = s.icon;
        serviceCancel.hidden = false;
        document.getElementById('serviceFormTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Modifier le service';
        document.getElementById('serviceSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications';
        serviceForm.scrollIntoView({ behavior: 'smooth' });
      });
    });

    list.querySelectorAll('.delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce service ?')) return;
        const res = await fetch(`/api/admin/services/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Service supprimé.', 'success');
          loadAdminServices();
        } else {
          showToast('Erreur lors de la suppression.', 'error');
        }
      });
    });
  } catch (_) {
    list.innerHTML = '<p class="loading">Impossible de charger les services.</p>';
  }
}

/* ============================================================
   UTILITAIRES
============================================================ */
let toastTimer;
function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* ---------- Lancement ---------- */
checkSession();
