(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function closeAllMenus() {
    document.querySelectorAll('.menu-button').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.mobile-menu').forEach(function (menu) {
      menu.classList.remove('is-open');
      menu.classList.remove('open');
      menu.style.display = '';
    });
    document.documentElement.classList.remove('mobile-menu-open');
  }

  function openMenu(button, menu) {
    button.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    menu.classList.add('open');
    menu.style.display = 'flex';
    menu.style.position = 'fixed';
    menu.style.left = '0';
    menu.style.right = '0';
    menu.style.top = window.innerWidth <= 760 ? '68px' : '78px';
    menu.style.zIndex = '9999';
    document.documentElement.classList.add('mobile-menu-open');
  }

  function bind() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.menu-button'));
    buttons.forEach(function (button) {
      var menuId = button.getAttribute('aria-controls') || 'mobileMenu';
      var menu = document.getElementById(menuId) || document.querySelector('.mobile-menu');
      if (!menu || button.getAttribute('data-menu-fix-bound') === 'true') return;
      button.setAttribute('data-menu-fix-bound', 'true');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-expanded', 'false');

      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        closeAllMenus();
        if (!isOpen) openMenu(button, menu);
      }, true);

      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeAllMenus);
      });
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      var insideMenu = target.closest && target.closest('.mobile-menu');
      var insideButton = target.closest && target.closest('.menu-button');
      if (!insideMenu && !insideButton) closeAllMenus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllMenus();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1180) closeAllMenus();
    });
  }

  ready(bind);
})();
