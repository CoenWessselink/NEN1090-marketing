/* WeldInspect Pro — Enterprise Animations V2 */
(function () {
  /* Scroll reveal with stagger */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          var children = e.target.querySelectorAll('.stagger');
          children.forEach(function (child, i) {
            child.style.transitionDelay = (i * 0.08) + 's';
            child.classList.add('visible');
          });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* Animated counters */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var counted = false;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !counted) {
          counted = true;
          var duration = 2000;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var ease = 1 - Math.pow(1 - p, 4);
            var val = Math.floor(ease * target);
            el.textContent = prefix + (val >= 1000 ? val.toLocaleString('nl-NL') : val) + suffix;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    cio.observe(el);
  });

  /* Subtle parallax on scroll */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length) {
    var onScroll = function () {
      var scrollY = window.pageYOffset;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
        el.style.transform = 'translateY(' + (-offset).toFixed(1) + 'px)';
      });
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(function () { onScroll(); ticking = false; }); ticking = true; }
    }, { passive: true });
  }

  /* Navbar active state */
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }
})();
