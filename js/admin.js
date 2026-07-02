/* Admin panel: login gate, course CRUD, scheduling, registrations, settings */

document.addEventListener('DOMContentLoaded', () => {
  const loginShell = document.getElementById('login-shell');
  const adminShell = document.getElementById('admin-shell');

  function formatMoney(amount, currency) { return `${Number(amount).toFixed(2)} ${currency || 'KWD'}`; }
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function showAdmin() {
    loginShell.style.display = 'none';
    adminShell.style.display = 'grid';
    renderAll();
  }

  function showLogin() {
    loginShell.style.display = 'flex';
    adminShell.style.display = 'none';
    document.getElementById('pw-hint').textContent = ReemoraStore.getDefaultPasswordHint();
  }

  if (ReemoraStore.isAdminLoggedIn()) {
    showAdmin();
  } else {
    showLogin();
  }

  // ---- Login ----
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('admin-password').value;
    const alertBox = document.getElementById('login-alert');
    if (ReemoraStore.login(pw)) {
      alertBox.className = 'alert';
      showAdmin();
    } else {
      alertBox.textContent = 'Incorrect password. Please try again.';
      alertBox.className = 'alert show alert-error';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    ReemoraStore.logout();
    showLogin();
  });

  // ---- Tabs ----
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const tab = link.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(sec => {
        sec.style.display = sec.dataset.tabContent === tab ? 'block' : 'none';
      });
      renderAll();
    });
  });

  // ---- Modal helpers ----
  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('open'));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  // ---- Render everything ----
  function renderAll() {
    renderDashboard();
    renderCoursesTable();
    renderScheduleTable();
    renderRegistrationsTable();
  }

  function renderDashboard() {
    const courses = ReemoraStore.getCourses();
    const regs = ReemoraStore.getRegistrations();
    document.getElementById('kpi-courses').textContent = courses.length;
    document.getElementById('kpi-upcoming').textContent = courses.filter(c => c.status === 'upcoming').length;
    document.getElementById('kpi-registrations').textContent = regs.length;
    document.getElementById('kpi-seats').textContent = regs.reduce((sum, r) => sum + (r.seats || 0), 0);

    const tbody = document.querySelector('#recent-reg-table tbody');
    const recent = regs.slice(-5).reverse();
    tbody.innerHTML = recent.length ? recent.map(r => `
      <tr>
        <td>${r.fullName}</td>
        <td>${r.courseTitle}</td>
        <td>${r.seats}</td>
        <td>${formatMoney(r.amount, r.currency)}</td>
        <td><span class="status-pill upcoming">${r.paymentStatus}</span></td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') : `<tr><td colspan="6" style="text-align:center; color:var(--ink-soft);">No registrations yet.</td></tr>`;
  }

  function renderCoursesTable() {
    const courses = ReemoraStore.getCourses();
    const tbody = document.querySelector('#courses-table tbody');
    tbody.innerHTML = courses.length ? courses.map(c => `
      <tr>
        <td><img class="thumb" src="${c.image || `images/courses/${c.id}.svg`}" onerror="this.src='images/courses/placeholder.svg'" alt=""></td>
        <td>${c.title}</td>
        <td>${c.category}</td>
        <td>${c.level}</td>
        <td>${formatMoney(c.price, c.currency)}</td>
        <td>${c.seatsAvailable}/${c.seatsTotal}</td>
        <td><span class="status-pill ${c.status}">${c.status}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit-course="${c.id}" title="Edit">✎</button>
            <button class="icon-btn danger" data-delete-course="${c.id}" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--ink-soft);">No courses yet. Click "Add Course" to create one.</td></tr>`;

    tbody.querySelectorAll('[data-edit-course]').forEach(btn => {
      btn.addEventListener('click', () => openCourseModal(btn.dataset.editCourse));
    });
    tbody.querySelectorAll('[data-delete-course]').forEach(btn => {
      btn.addEventListener('click', () => {
        const course = ReemoraStore.getCourseById(btn.dataset.deleteCourse);
        if (confirm(`Delete "${course.title}"? This cannot be undone.`)) {
          ReemoraStore.deleteCourse(btn.dataset.deleteCourse);
          renderAll();
        }
      });
    });
  }

  function renderScheduleTable() {
    const courses = ReemoraStore.getCourses();
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = courses.length ? courses.map(c => `
      <tr>
        <td>${c.title}</td>
        <td>${formatDate(c.startDate)}</td>
        <td>${formatDate(c.endDate)}</td>
        <td>${c.sessionDays}</td>
        <td>${c.sessionTime}</td>
        <td><span class="status-pill ${c.status}">${c.status}</span></td>
        <td><button class="icon-btn" data-edit-schedule="${c.id}" title="Edit Schedule">🗓</button></td>
      </tr>
    `).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--ink-soft);">No courses to schedule yet.</td></tr>`;

    tbody.querySelectorAll('[data-edit-schedule]').forEach(btn => {
      btn.addEventListener('click', () => openScheduleModal(btn.dataset.editSchedule));
    });
  }

  function renderRegistrationsTable() {
    const regs = ReemoraStore.getRegistrations().slice().reverse();
    const tbody = document.querySelector('#registrations-table tbody');
    tbody.innerHTML = regs.length ? regs.map(r => `
      <tr>
        <td>${r.fullName}</td>
        <td>${r.email}</td>
        <td>${r.phone}</td>
        <td>${r.courseTitle}</td>
        <td>${r.seats}</td>
        <td>${formatMoney(r.amount, r.currency)}</td>
        <td><span class="status-pill upcoming">${r.paymentStatus}</span></td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--ink-soft);">No registrations yet.</td></tr>`;
  }

  // ---- Course modal (add/edit) ----
  const courseForm = document.getElementById('course-form');
  const imageInput = document.getElementById('course-image-input');
  const imagePreview = document.getElementById('image-preview');
  const imageUploadText = document.getElementById('image-upload-text');
  let uploadedImageData = '';

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImageData = reader.result;
      imagePreview.src = uploadedImageData;
      imagePreview.style.display = 'block';
      imageUploadText.textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('add-course-btn').addEventListener('click', () => openCourseModal(null));

  function resetCourseForm() {
    courseForm.reset();
    document.getElementById('course-id-field').value = '';
    uploadedImageData = '';
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    imageUploadText.textContent = 'Click or drag an image to upload (optional — a branded placeholder is used if left empty)';
    document.getElementById('f-currency').value = 'KWD';
    document.getElementById('f-instructor').value = 'Reemora Certified Trainer';
  }

  function openCourseModal(id) {
    resetCourseForm();
    document.getElementById('course-modal-title').textContent = id ? 'Edit Course' : 'Add Course';
    if (id) {
      const c = ReemoraStore.getCourseById(id);
      document.getElementById('course-id-field').value = c.id;
      document.getElementById('f-title').value = c.title;
      document.getElementById('f-category').value = c.category;
      document.getElementById('f-level').value = c.level;
      document.getElementById('f-price').value = c.price;
      document.getElementById('f-currency').value = c.currency;
      document.getElementById('f-duration').value = c.durationWeeks;
      document.getElementById('f-seats').value = c.seatsTotal;
      document.getElementById('f-instructor').value = c.instructor;
      document.getElementById('f-short-desc').value = c.shortDescription;
      document.getElementById('f-desc').value = c.description;
      document.getElementById('f-curriculum').value = (c.curriculum || []).join('\n');
      if (c.image) {
        uploadedImageData = c.image;
        imagePreview.src = c.image;
        imagePreview.style.display = 'block';
        imageUploadText.textContent = 'Current image (upload a new file to replace)';
      }
    }
    openModal('course-modal');
  }

  courseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('course-id-field').value;
    const seatsTotal = parseInt(document.getElementById('f-seats').value, 10);

    const data = {
      title: document.getElementById('f-title').value.trim(),
      category: document.getElementById('f-category').value.trim(),
      level: document.getElementById('f-level').value,
      price: parseFloat(document.getElementById('f-price').value),
      currency: document.getElementById('f-currency').value.trim() || 'KWD',
      durationWeeks: parseInt(document.getElementById('f-duration').value, 10),
      seatsTotal,
      instructor: document.getElementById('f-instructor').value.trim(),
      shortDescription: document.getElementById('f-short-desc').value.trim(),
      description: document.getElementById('f-desc').value.trim(),
      curriculum: document.getElementById('f-curriculum').value.split('\n').map(s => s.trim()).filter(Boolean),
      image: uploadedImageData
    };

    if (id) {
      const existing = ReemoraStore.getCourseById(id);
      const seatsBooked = existing.seatsTotal - existing.seatsAvailable;
      data.seatsAvailable = Math.max(0, seatsTotal - seatsBooked);
      ReemoraStore.updateCourse(id, data);
    } else {
      data.startDate = '';
      data.endDate = '';
      data.sessionDays = 'TBA';
      data.sessionTime = 'TBA';
      data.status = 'upcoming';
      data.seatsAvailable = seatsTotal;
      ReemoraStore.addCourse(data);
    }

    closeModal('course-modal');
    renderAll();
  });

  // ---- Schedule modal ----
  const scheduleForm = document.getElementById('schedule-form');

  function openScheduleModal(id) {
    const c = ReemoraStore.getCourseById(id);
    document.getElementById('schedule-course-title').textContent = c.title;
    document.getElementById('s-course-id').value = c.id;
    document.getElementById('s-start').value = c.startDate || '';
    document.getElementById('s-end').value = c.endDate || '';
    document.getElementById('s-days').value = c.sessionDays || '';
    document.getElementById('s-time').value = c.sessionTime || '';
    document.getElementById('s-status').value = c.status || 'upcoming';
    openModal('schedule-modal');
  }

  scheduleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('s-course-id').value;
    ReemoraStore.updateCourse(id, {
      startDate: document.getElementById('s-start').value,
      endDate: document.getElementById('s-end').value,
      sessionDays: document.getElementById('s-days').value.trim(),
      sessionTime: document.getElementById('s-time').value.trim(),
      status: document.getElementById('s-status').value
    });
    closeModal('schedule-modal');
    renderAll();
  });

  // ---- Settings ----
  document.getElementById('password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newPw = document.getElementById('new-password').value;
    ReemoraStore.changePassword(newPw);
    const alertBox = document.getElementById('settings-alert');
    alertBox.textContent = 'Password updated successfully.';
    alertBox.className = 'alert show alert-success';
    document.getElementById('password-form').reset();
  });
});
