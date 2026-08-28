(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- WELCOME SCREEN ---------- */
  var welcomeScreen = document.getElementById('welcomeScreen');
  document.body.classList.add('welcome-active');
  function leaveWelcome(){
    welcomeScreen.classList.add('is-leaving');
    document.body.classList.remove('welcome-active');
    setTimeout(function(){ welcomeScreen.remove(); }, reduceMotion ? 0 : 1000);
  }
  setTimeout(leaveWelcome, reduceMotion ? 0 : 2400);

  /* ---------- NAV SHRINK ON SCROLL ---------- */
  var navbar = document.getElementById('navbar');
  var ticking = false;
  function onScroll(){
    if(!ticking){
      requestAnimationFrame(function(){
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* ---------- MOBILE NAV TOGGLE ---------- */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');
  toggle.addEventListener('click', function(){ links.classList.toggle('open'); });
  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ links.classList.remove('open'); });
  });

  /* ---------- SCROLL REVEAL ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  [document.querySelector('.about-grid-new'),
   document.querySelector('.timeline'),
   document.querySelector('.project-grid'),
   document.querySelector('.stack-grid')]
    .forEach(function(group){
      if(!group) return;
      group.querySelectorAll('.reveal').forEach(function(child, i){
        child.style.setProperty('--delay', (i * 120) + 'ms');
      });
    });

  document.querySelectorAll('.stack-grid .tag').forEach(function(tag, i){
    tag.style.setProperty('--tag-delay', (i * 150) + 'ms');
  });

  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- HERO PARTICLE GRID (replaces constellation) ---------- */
  var canvas = document.getElementById('heroCanvas');
  if(canvas){
    var ctx = canvas.getContext('2d');
    var particles = [];
    var PARTICLE_COUNT = 55;
    var heroEl = document.querySelector('.hero');

    function resizeCanvas(){
      canvas.width  = heroEl.clientWidth;
      canvas.height = heroEl.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function randomParticle(){
      return {
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.5 + 0.2
      };
    }
    for(var i = 0; i < PARTICLE_COUNT; i++) particles.push(randomParticle());

    var mousePX = -9999, mousePY = -9999;
    heroEl.addEventListener('mousemove', function(e){
      var r = heroEl.getBoundingClientRect();
      mousePX = e.clientX - r.left;
      mousePY = e.clientY - r.top;
    });
    heroEl.addEventListener('mouseleave', function(){ mousePX = -9999; mousePY = -9999; });

    function drawParticles(){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw connection lines
      for(var a = 0; a < particles.length; a++){
        for(var b = a+1; b < particles.length; b++){
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if(dist < 150){
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139,92,246,' + ((1 - dist/150) * 0.12).toFixed(3) + ')';
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      // Draw dots
      particles.forEach(function(p){
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(196,181,253,' + p.opacity.toFixed(2) + ')';
        ctx.fill();
      });
    }

    function stepParticles(){
      if(!reduceMotion){
        particles.forEach(function(p){
          p.x += p.vx; p.y += p.vy;
          if(p.x < 0 || p.x > canvas.width)  p.vx *= -1;
          if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
          // Gentle mouse repel
          var dx = p.x - mousePX, dy = p.y - mousePY;
          var d  = Math.sqrt(dx*dx + dy*dy);
          if(d < 90 && d > 0.1){
            p.x += (dx/d) * 0.6;
            p.y += (dy/d) * 0.6;
          }
        });
      }
      drawParticles();
      requestAnimationFrame(stepParticles);
    }
    stepParticles();
  }

  /* ---------- ID CARD — 3D TILT + DRAG ---------- */
  var idCard    = document.getElementById('idCard');
  var idWrapper = document.querySelector('.id-card-wrapper');

  if(idCard && idWrapper){
    /* 3D tilt on mouse hover */
    var tiltTarget = { rx: 0, ry: 0 };
    var tiltCurrent = { rx: 0, ry: 0 };
    var tiltRAF = null;
    var isDragging = false;

    function lerp(a, b, t){ return a + (b - a) * t; }

    function animateTilt(){

    // Smoothly move current rotation toward target
    tiltCurrent.rx = lerp(tiltCurrent.rx, tiltTarget.rx, 0.08);
    tiltCurrent.ry = lerp(tiltCurrent.ry, tiltTarget.ry, 0.08);

    // The animation loop ALWAYS controls the card transform
    var scale = isDragging ? 1.05 : 1.02;

    idCard.style.transform =
        'perspective(700px) ' +
        'rotateX(' + tiltCurrent.rx + 'deg) ' +
        'rotateY(' + tiltCurrent.ry + 'deg) ' +
        'scale3d(' + scale + ',' + scale + ',' + scale + ')';

    // Holographic sheen
    var holoEl = idCard.querySelector('.id-holo');

    if(holoEl){
        var xPct = (tiltCurrent.ry / 22 + 0.5) * 100;
        var yPct = (-tiltCurrent.rx / 18 + 0.5) * 100;

        holoEl.style.background =
            'radial-gradient(circle at ' +
            xPct + '% ' + yPct + '%, ' +
            'rgba(196,181,253,0.18) 0%, ' +
            'rgba(139,92,246,0.08) 40%, ' +
            'transparent 70%)';
    }

    tiltRAF = requestAnimationFrame(animateTilt);
}

tiltRAF = requestAnimationFrame(animateTilt);

    idCard.addEventListener('mousemove', function(e){
      if(isDragging) return;
      var r   = idCard.getBoundingClientRect();
      var cx  = r.left + r.width / 2;
      var cy  = r.top  + r.height / 2;
      tiltTarget.rx = -((e.clientY - cy) / (r.height / 2)) * 18;
      tiltTarget.ry =  ((e.clientX - cx) / (r.width  / 2)) * 22;
    });
    idCard.addEventListener('mouseleave', function(){
      if(!isDragging){ tiltTarget.rx = 0; tiltTarget.ry = 0; }
    });

    /* Drag to move */
    var dragStartX = 0, dragStartY = 0;
    var wrapStartX = 0, wrapStartY = 0;
    var currentX   = 0, currentY  = 0;
    var velX = 0, velY = 0;
    var lastX = 0, lastY = 0;

    function getOffsets(el){
      var s = window.getComputedStyle(el);
      return {
        x: parseFloat(s.getPropertyValue('--drag-x') || 0) || 0,
        y: parseFloat(s.getPropertyValue('--drag-y') || 0) || 0
      };
    }

    idCard.addEventListener('mousedown', function(e){
      e.preventDefault();
      isDragging = true;
      idCard.classList.add('dragging');
      dragStartX = e.clientX; dragStartY = e.clientY;
      wrapStartX = currentX;  wrapStartY = currentY;
      lastX = e.clientX; lastY = e.clientY;
      velX  = 0; velY  = 0;
    });

    window.addEventListener('mousemove', function(e){
    if(!isDragging) return;

    velX = e.clientX - lastX;
    velY = e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    currentX = wrapStartX + (e.clientX - dragStartX);
    currentY = wrapStartY + (e.clientY - dragStartY);

    idWrapper.style.transform =
        'translate(' + currentX + 'px,' + currentY + 'px)';

    // Only update the target.
    // animateTilt() handles the actual rotation.
    tiltTarget.ry = velX * 2.5;
    tiltTarget.rx = -velY * 2.5;
});

    window.addEventListener('mouseup', function(){
      if(!isDragging) return;
      isDragging = false;
      idCard.classList.remove('dragging');
      // Momentum + snap back with spring
      var momentum = { x: velX * 4, y: velY * 4 };
      var targetX = currentX + momentum.x;
      var targetY = currentY + momentum.y;
      // Snap back to origin
      function springBack(){
        currentX = lerp(currentX, 0, 0.09);
        currentY = lerp(currentY, 0, 0.09);
        idWrapper.style.transform = 'translate(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px)';
        if(Math.abs(currentX) > 0.5 || Math.abs(currentY) > 0.5){
          requestAnimationFrame(springBack);
        } else {
          currentX = 0; currentY = 0;
          idWrapper.style.transform = '';
        }
      }
      tiltTarget.rx = 0; tiltTarget.ry = 0;
      springBack();
    });

    /* Touch drag support */
    idCard.addEventListener('touchstart', function(e){
      var t = e.touches[0];
      isDragging = true;
      idCard.classList.add('dragging');
      dragStartX = t.clientX; dragStartY = t.clientY;
      wrapStartX = currentX;  wrapStartY = currentY;
    }, {passive:true});
    window.addEventListener('touchmove', function(e){
      if(!isDragging) return;
      var t = e.touches[0];
      currentX = wrapStartX + (t.clientX - dragStartX);
      currentY = wrapStartY + (t.clientY - dragStartY);
      idWrapper.style.transform = 'translate(' + currentX + 'px,' + currentY + 'px)';
    }, {passive:true});
    window.addEventListener('touchend', function(){
      if(!isDragging) return;
      isDragging = false;
      idCard.classList.remove('dragging');
      tiltTarget.rx = 0; tiltTarget.ry = 0;
      function snapBack(){
        currentX = lerp(currentX, 0, 0.1);
        currentY = lerp(currentY, 0, 0.1);
        idWrapper.style.transform = 'translate(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px)';
        if(Math.abs(currentX) > 0.5 || Math.abs(currentY) > 0.5) requestAnimationFrame(snapBack);
        else { currentX=0; currentY=0; idWrapper.style.transform=''; }
      }
      snapBack();
    });
  }

  /* ---------- PORTFOLIO TABS ---------- */
  var tabs = document.querySelectorAll('.ptab');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.portfolio-panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.getElementById('panel-' + tab.dataset.tab);
      if(panel) panel.classList.add('active');
    });
  });

  /* ---------- CERTIFICATION WINDOWS ---------- */
  var certDialog = document.getElementById('certDialog');
  var certCards = document.querySelectorAll('.cert-window');
  var certOrigin = null;
  if(certDialog && certCards.length){
    var dialogTitle = document.getElementById('certDialogTitle');
    var dialogLabel = document.getElementById('certDialogLabel');
    var dialogCopy = document.getElementById('certDialogCopy');
    var dialogFocus = document.getElementById('certDialogFocus');
    var dialogMark = document.getElementById('certDialogMark');
    var dialogPdf = document.getElementById('certDialogPdf');
    var dialogOpen = document.getElementById('certDialogOpen');

    function closeCertDialog(){
      certDialog.hidden = true;
      document.body.classList.remove('cert-dialog-open');
      certCards.forEach(function(card){ card.setAttribute('aria-expanded', 'false'); });
      if(certOrigin) certOrigin.focus();
    }

    certCards.forEach(function(card){
      card.addEventListener('click', function(){
        certOrigin = card;
        dialogTitle.textContent = card.dataset.certTitle;
        dialogLabel.textContent = 'certificate_' + card.dataset.certMark;
        dialogCopy.textContent = card.dataset.certCopy;
        dialogFocus.textContent = card.dataset.certFocus;
        dialogMark.textContent = card.dataset.certMark;
        dialogPdf.src = card.dataset.certPdf;
        dialogOpen.href = card.dataset.certPdf;
        certDialog.hidden = false;
        document.body.classList.add('cert-dialog-open');
        card.setAttribute('aria-expanded', 'true');
        certDialog.querySelector('button[data-cert-close]').focus();
      });
    });

    certDialog.querySelectorAll('[data-cert-close]').forEach(function(closeButton){
      closeButton.addEventListener('click', closeCertDialog);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !certDialog.hidden) closeCertDialog();
    });
  }

  /* ---------- CONTACT MAILTO FORM ---------- */
  var contactForm = document.getElementById('contactForm');
  if(contactForm){
    var contactMessage = document.getElementById('contactMessage');
    var contactCount = document.getElementById('contactCount');
    var contactPrompt = document.getElementById('contactPrompt');
    contactMessage.addEventListener('input', function(){
      contactCount.value = contactMessage.value.length;
      contactPrompt.textContent = contactMessage.value.length > 0 ? 'Looks good. Ready when you are.' : 'I usually reply within 24 hours.';
    });
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('contactName').value.trim();
      var comment = document.getElementById('contactMessage').value.trim();
      var subject = 'Portfolio message from ' + name;
      var body = 'Name: ' + name + '\n\nComment:\n' + comment;
      var mailto = 'mailto:joshuaeldrick@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      document.getElementById('contactFormStatus').textContent = 'Opening your email app...';
      window.location.href = mailto;
    });
  }

  /* ---------- PROJECT CARD CURSOR GLOW ---------- */
  document.querySelectorAll('.project-card').forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
  });

  /* ---------- ACTIVE NAV LINK ON SCROLL ---------- */
  var navSections = ['home','about','portfolio','contact'];
  var navLinks2 = {};
  navSections.forEach(function(id){ navLinks2[id] = document.getElementById('nav-' + id); });
  function updateActiveNav(){
    var scrollY = window.scrollY + 140;
    var active  = 'home';
    navSections.forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.offsetTop <= scrollY) active = id;
    });
    navSections.forEach(function(id){
      if(navLinks2[id]) navLinks2[id].classList.toggle('nav-active', id === active);
    });
  }
  window.addEventListener('scroll', updateActiveNav, {passive:true});
  updateActiveNav();

})();
