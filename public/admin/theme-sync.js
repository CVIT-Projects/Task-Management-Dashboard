(function() {
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const currentTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(currentTheme);

  // Sync with other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      applyTheme(e.newValue);
      const toggle = document.getElementById('adminThemeToggle');
      if (toggle) toggle.textContent = e.newValue === 'dark' ? '☀️' : '🌙';
    }
  });

  const initToggle = () => {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'adminThemeToggle';
    toggleBtn.className = 'view-dashboard-btn';
    toggleBtn.style.marginRight = '10px';
    toggleBtn.style.background = 'var(--bg-card)';
    toggleBtn.style.color = 'var(--text-primary)';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.textContent = localStorage.getItem('theme') === 'dark' ? '☀️' : '🌙';

    toggleBtn.onclick = () => {
      const newTheme = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
      toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      
      // Dispatch a storage event manually for this window if needed 
      // (usually storage events only fire in OTHER windows, but we want our state consistent)
    };

    // Insert before the first button/link
    headerActions.insertBefore(toggleBtn, headerActions.querySelector('button, a'));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggle);
  } else {
    initToggle();
  }
})();
