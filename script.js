(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- WELCOME SCREEN ---------- */
  var welcomeScreen = document.getElementById('welcomeScreen');
  document.body.classList.add('welcome-active');
  function leaveWelcome(){
    welcomeScreen.classList.add('is-leaving');
    document.body.classList.remove('welcome-active');
    setTimeout(function(){ welcomeScreen.remove(); }, reduceMotion ? 0 : 1200);
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

  /* ---------- ID CARD — 3D TILT + DRAG + LANYARD PHYSICS ---------- */
  var idCard    = document.getElementById('idCard');
  var idWrapper = document.querySelector('.id-card-wrapper');
  var idShadow  = idWrapper ? idWrapper.querySelector('.id-shadow') : null;

  if(idCard && idWrapper){
    /* Lanyard Physics variables */
    var ropeNodes = [];
    var nodeCount = 13; // odd number, node 6 is center anchor
    var totalLength = 180; // shorter, balanced lanyard length
    var segmentLength = totalLength / (nodeCount / 2);
    var gravity = 0.45;
    var friction = 0.97;
    var pivotLeft = { x: 120, y: 18 };
    var pivotRight = { x: 180, y: 18 };

    /* Drag coordinates state */
    var dragStartX = 0, dragStartY = 0;
    var wrapStartX = 0, wrapStartY = 0;
    var currentX   = 0, currentY  = 0;
    var velX = 0, velY = 0;
    var lastX = 0, lastY = 0;
    var isDragging = false;

    // Initialize rope node positions
    function initRope() {
      ropeNodes = [];
      for (var i = 0; i < nodeCount; i++) {
        var startX, startY;
        if (i <= 6) {
          var fraction = i / 6;
          startX = pivotLeft.x + (150 - pivotLeft.x) * fraction;
          startY = pivotLeft.y + (200 - pivotLeft.y) * fraction;
        } else {
          var fraction = (i - 6) / 6;
          startX = 150 + (pivotRight.x - 150) * fraction;
          startY = 200 + (pivotRight.y - 200) * fraction;
        }
        ropeNodes.push({
          x: startX,
          y: startY,
          px: startX,
          py: startY
        });
      }
    }
    initRope();

    // Verlet integration rope solver
    function updateLanyard() {
      // 1. Verlet integration
      for (var i = 0; i < nodeCount; i++) {
        if (i === 0 || i === 6 || i === 12) continue; // skip fixed nodes
        var n = ropeNodes[i];
        var vx = (n.x - n.px) * friction;
        var vy = (n.y - n.py) * friction;

        n.px = n.x;
        n.py = n.y;

        n.x += vx;
        n.y += vy + gravity;
      }

      // 2. Set position of anchor nodes
      ropeNodes[0].x = pivotLeft.x;
      ropeNodes[0].y = pivotLeft.y;
      ropeNodes[12].x = pivotRight.x;
      ropeNodes[12].y = pivotRight.y;
      
      // Node 6 is attached to top-center of card (relative to SVG origin X=150, Y=200)
      ropeNodes[6].x = 150 + currentX;
      ropeNodes[6].y = 200 + currentY;

      // 3. Resolve link constraints
      var iterations = 6;
      for (var iter = 0; iter < iterations; iter++) {
        for (var i = 0; i < nodeCount - 1; i++) {
          var n1 = ropeNodes[i];
          var n2 = ropeNodes[i+1];

          var dx = n2.x - n1.x;
          var dy = n2.y - n1.y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist === 0) continue;

          var diff = segmentLength - dist;
          var percent = (diff / dist) * 0.5;
          var offsetX = dx * percent;
          var offsetY = dy * percent;

          if (i !== 0 && i !== 6 && i !== 12) {
            n1.x -= offsetX;
            n1.y -= offsetY;
          }
          if (i+1 !== 0 && i+1 !== 6 && i+1 !== 12) {
            n2.x += offsetX;
            n2.y += offsetY;
          }
        }
      }

      // 4. Update SVG path
      var pathEl = document.getElementById('lanyardPath');
      if (pathEl) {
        var d = "M " + ropeNodes[0].x.toFixed(1) + " " + ropeNodes[0].y.toFixed(1);
        for (var i = 1; i < nodeCount; i++) {
          d += " L " + ropeNodes[i].x.toFixed(1) + " " + ropeNodes[i].y.toFixed(1);
        }
        pathEl.setAttribute('d', d);
      }
    }

    /* 3D tilt on mouse hover */
    var tiltTarget = { rx: 0, ry: 0 };
    var tiltCurrent = { rx: 0, ry: 0 };
    var tiltRAF = null;

    function lerp(a, b, t){ return a + (b - a) * t; }

    function animateTilt(){
      // Smoothly move current rotation toward target
      tiltCurrent.rx = lerp(tiltCurrent.rx, tiltTarget.rx, 0.08);
      tiltCurrent.ry = lerp(tiltCurrent.ry, tiltTarget.ry, 0.08);

      var scale = isDragging ? 1.05 : 1.02;

      // Card translation (drag) + tilt
      idCard.style.transform =
          'translate3d(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px, 0) ' +
          'perspective(700px) ' +
          'rotateX(' + tiltCurrent.rx + 'deg) ' +
          'rotateY(' + tiltCurrent.ry + 'deg) ' +
          'scale3d(' + scale + ',' + scale + ',' + scale + ')';

      // Drag shadow displacement and scaling
      if (idShadow) {
        idShadow.style.transform =
            'translate3d(' + currentX.toFixed(2) + 'px, ' + (currentY * 0.15).toFixed(2) + 'px, 0) ' +
            'scale(' + (1 - Math.abs(currentY)/600).toFixed(3) + ')';
        idShadow.style.opacity = (isDragging ? 0.15 : 0.28) * (1 - Math.min(Math.abs(currentY)/300, 0.5));
      }

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

      // Update physics for lanyard rope
      updateLanyard();

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

    /* Drag handlers */
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

      // Clamp drag boundaries relative to initial position
      currentX = Math.max(-180, Math.min(180, wrapStartX + (e.clientX - dragStartX)));
      currentY = Math.max(-150, Math.min(200, wrapStartY + (e.clientY - dragStartY)));

      tiltTarget.ry = velX * 2.5;
      tiltTarget.rx = -velY * 2.5;
    });

    function handleRelease(){
      if(!isDragging) return;
      isDragging = false;
      idCard.classList.remove('dragging');
      tiltTarget.rx = 0; tiltTarget.ry = 0;
      
      // Momentum-based snap back with spring physics
      function springBack(){
        if (isDragging) return;
        currentX = lerp(currentX, 0, 0.09);
        currentY = lerp(currentY, 0, 0.09);
        if(Math.abs(currentX) > 0.1 || Math.abs(currentY) > 0.1){
          requestAnimationFrame(springBack);
        } else {
          currentX = 0; currentY = 0;
        }
      }
      springBack();
    }

    window.addEventListener('mouseup', handleRelease);

    /* Touch drag support */
    idCard.addEventListener('touchstart', function(e){
      var t = e.touches[0];
      isDragging = true;
      idCard.classList.add('dragging');
      dragStartX = t.clientX; dragStartY = t.clientY;
      wrapStartX = currentX;  wrapStartY = currentY;
      lastX = t.clientX; lastY = t.clientY;
      velX = 0; velY = 0;
    }, {passive:true});

    window.addEventListener('touchmove', function(e){
      if(!isDragging) return;
      var t = e.touches[0];

      velX = t.clientX - lastX;
      velY = t.clientY - lastY;

      lastX = t.clientX;
      lastY = t.clientY;

      currentX = Math.max(-180, Math.min(180, wrapStartX + (t.clientX - dragStartX)));
      currentY = Math.max(-150, Math.min(200, wrapStartY + (t.clientY - dragStartY)));

      tiltTarget.ry = velX * 2.5;
      tiltTarget.rx = -velY * 2.5;
    }, {passive:true});

    window.addEventListener('touchend', handleRelease);
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
    var dialogImage = document.getElementById('certDialogImage');
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
        dialogLabel.textContent = card.dataset.certLabel;
        dialogCopy.textContent = card.dataset.certCopy;
        dialogFocus.textContent = card.dataset.certFocus;
        dialogImage.src = card.dataset.certPng;
        dialogOpen.href = card.dataset.certPng;
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

  /* ---------- SCROLL HANDSHAKE ---------- */
var handshake = document.querySelector('.handshake-section');
if(handshake && !reduceMotion){
  var leftHand = handshake.querySelector('.hand-left');
  var rightHand = handshake.querySelector('.hand-right');
  var leftInner = leftHand.querySelector('.hand-inner');
  var rightInner = rightHand.querySelector('.hand-inner');
  var handshakeHeadline = handshake.querySelector('.contact-headline');
  var handshakeHint = handshake.querySelector('.scroll-hint');
  var handshakeSpark = handshake.querySelector('.spark');
  var handshakeMet = false;
  
  function updateHandshake(){
    var rect = handshake.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var raw = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    var eased = 1 - Math.pow(1 - raw, 3);
    
    // FIX: Increased multiplier from 152 to 195 to bring the hands together at the center
    leftHand.style.transform = 'translate(' + (eased * 178 - 150) + '%, -50%) rotate(' + (eased * 8 - 8) + 'deg)';
    rightHand.style.transform = 'translate(' + (150 - eased * 178) + '%, -50%) rotate(' + (8 - eased * 8) + 'deg)';
    
    var textT = Math.min(1, Math.max(0, (raw - .42) / .38));
    handshakeHeadline.style.opacity = textT;
    handshakeHeadline.style.transform = 'translate(-50%, ' + (16 - textT * 16) + 'px)';
    
    handshakeHint.style.opacity = Math.max(0, 1 - raw / .15);
    
    var sparkT = Math.min(1, Math.max(0, (raw - .82) / .18));
    handshakeSpark.style.opacity = sparkT;
    handshakeSpark.style.transform = 'translate(-50%, -50%) scale(' + (.65 + sparkT * .6) + ')';
    
    if(raw > .92 && !handshakeMet){ 
      handshakeMet = true; 
      leftInner.classList.add('shake'); 
      rightInner.classList.add('shake'); 
    }
    if(raw < .85 && handshakeMet){ 
      handshakeMet = false; 
      leftInner.classList.remove('shake'); 
      rightInner.classList.remove('shake'); 
    }
  }
  
  window.addEventListener('scroll', updateHandshake, {passive:true});
  window.addEventListener('resize', updateHandshake);
  updateHandshake();
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
    card.addEventListener('click', function(e){
      if(e.target.closest('a')) return;
      var isOpen = card.classList.toggle('is-open');
      card.setAttribute('aria-expanded', String(isOpen));
    });
    card.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      card.click();
    });
  });

/* ---------- ACTIVE NAV LINK ON SCROLL ---------- */
var navSections = ['home', 'about', 'portfolio', 'contact'];
var navLinks2 = {};

navSections.forEach(function(id) {
  navLinks2[id] = document.getElementById('nav-' + id);
});

function updateActiveNav() {
  // Check a point around the upper-middle portion of the viewport
  var checkPosition = window.scrollY + (window.innerHeight * 0.35);
  var active = 'home';

  navSections.forEach(function(id) {
    var section = document.getElementById(id);

    if (!section) return;

    var sectionTop = section.offsetTop;
    var sectionBottom = sectionTop + section.offsetHeight;

    if (
      checkPosition >= sectionTop &&
      checkPosition < sectionBottom
    ) {
      active = id;
    }
  });

  navSections.forEach(function(id) {
    if (navLinks2[id]) {
      navLinks2[id].classList.toggle(
        'nav-active',
        id === active
      );
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('resize', updateActiveNav);
updateActiveNav();
})();
