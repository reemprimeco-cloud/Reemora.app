/* Course catalog page logic: filtering, search, dynamic rendering */

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('catalog-grid');
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('filter-category');
  const levelSelect = document.getElementById('filter-level');
  const resultsCount = document.getElementById('results-count');

  const courses = ReemoraStore.getCourses();

  const categories = Array.from(new Set(courses.map(c => c.category))).sort();
  categorySelect.innerHTML = '<option value="">All Categories</option>' +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  function courseCard(c) {
    const img = c.image || `images/courses/${c.id}.svg`;
    return `
      <div class="course-card">
        <div class="course-thumb">
          <span class="course-badge">${c.level}</span>
          <span class="course-price-tag">${formatMoney(c.price, c.currency)}</span>
          <img src="${img}" onerror="this.src='images/courses/placeholder.svg'" alt="${c.title}">
        </div>
        <div class="course-body">
          <div class="course-meta">
            <span>⏱ ${c.durationWeeks} weeks</span>
            <span>📅 ${formatDate(c.startDate)}</span>
            <span>🪑 ${c.seatsAvailable}/${c.seatsTotal} left</span>
          </div>
          <h3>${c.title}</h3>
          <p>${c.shortDescription}</p>
          <div class="course-actions">
            <a href="course-details.html?id=${c.id}" class="btn btn-ghost btn-sm">Details</a>
            <a href="register.html?course=${c.id}" class="btn btn-primary btn-sm">Register</a>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const cat = categorySelect.value;
    const level = levelSelect.value;

    const filtered = courses.filter(c => {
      const matchesTerm = !term || c.title.toLowerCase().includes(term) || c.shortDescription.toLowerCase().includes(term) || c.category.toLowerCase().includes(term);
      const matchesCat = !cat || c.category === cat;
      const matchesLevel = !level || c.level === level;
      return matchesTerm && matchesCat && matchesLevel;
    });

    resultsCount.textContent = `${filtered.length} course${filtered.length === 1 ? '' : 's'} found`;

    grid.innerHTML = filtered.length
      ? filtered.map(courseCard).join('')
      : `<div class="empty-state" style="grid-column:1/-1;">No courses match your filters. Try adjusting your search.</div>`;
  }

  searchInput.addEventListener('input', render);
  categorySelect.addEventListener('change', render);
  levelSelect.addEventListener('change', render);

  render();
});
