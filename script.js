/**
 * ZIMKNOWS PITCH DECK ENGINE
 * Precision choreography, low-latency video switching, canvas V2X mesh simulation.
 */

(function () {
  'use strict';

  // --- STATE ---
  let currentSlide = 1;
  let subStep = 0;
  const totalSlides = 5;

  // Max sub-steps per slide (0-indexed)
  const slideSteps = {
    1: 4, // 0: Init, 1: Vid1, 2: Vid2, 3: Vid3, 4: "Our roads are dark"
    2: 0, // 0: All stats shown with counters
    3: 2, // 0: Mesh animation, 1: Caterpillar reveal, 2: 4 Pillars & Quote
    4: 2, // 0: Dead zones intro, 1: QR code, 2: System screenshots
    5: 2  // 0: Ask breakdown, 1: NUST solo reveal, 2: Team & final QR
  };

  // Timer State
  let timerInterval = null;
  let secondsElapsed = 0;
  const presentationLimitSeconds = 240; // 4 minutes

  // Video references
  const vid1 = document.getElementById('vid1');
  const vid2 = document.getElementById('vid2');
  const vid3 = document.getElementById('vid3');
  const videos = [vid1, vid2, vid3];
  let isMuted = false;

  // DOM Elements
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const timerDisplay = document.getElementById('timerDisplay');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnAudio = document.getElementById('btnAudio');
  const btnReset = document.getElementById('btnReset');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  // --- INITIALIZATION ---
  function init() {
    setupKeyboardListeners();
    setupButtonListeners();
    setupParticles();
    setupMeshHighwayCanvas();
    preloadVideos();
    handleHashNavigation();
    updateView();

    window.addEventListener('hashchange', () => {
      handleHashNavigation();
      updateView();
    });
  }

  function handleHashNavigation() {
    // 1. Check Query Params (?slide=2&step=1)
    const params = new URLSearchParams(window.location.search);
    const sParam = parseInt(params.get('slide'), 10);
    if (!isNaN(sParam) && sParam >= 1 && sParam <= totalSlides) {
      currentSlide = sParam;
      const stepParam = parseInt(params.get('step'), 10);
      subStep = !isNaN(stepParam) ? stepParam : 0;
      return;
    }

    // 2. Check Hash (#3 or #3-2)
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const parts = hash.split('-');
      const slideNum = parseInt(parts[0], 10);
      if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
        currentSlide = slideNum;
        subStep = parts[1] !== undefined ? parseInt(parts[1], 10) || 0 : 0;
        return;
      }
    }

    // 3. Fallback: Check if any slide is already marked 'active' in DOM
    const activeSection = document.querySelector('.slide.active');
    if (activeSection && activeSection.dataset.slideIndex) {
      currentSlide = parseInt(activeSection.dataset.slideIndex, 10) || 1;
    }
  }

  // Preload and optimize video elements
  function preloadVideos() {
    videos.forEach((v) => {
      if (!v) return;
      v.preload = 'auto';
      v.playsInline = true;
      v.muted = isMuted;

      // When video ends, keep last frame
      v.addEventListener('ended', () => {
        // Optional subtle auto-advance can be placed here if desired
      });
    });
  }

  // --- TIMER ENGINE ---
  function startTimerIfNeeded() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      secondsElapsed++;
      renderTimer();
    }, 1000);
  }

  function renderTimer() {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} / 04:00`;

    const timerPill = document.querySelector('.timer-pill');
    if (secondsElapsed >= presentationLimitSeconds - 15) {
      timerPill.classList.remove('warning');
      timerPill.classList.add('danger');
    } else if (secondsElapsed >= presentationLimitSeconds - 60) {
      timerPill.classList.add('warning');
    } else {
      timerPill.classList.remove('warning', 'danger');
    }
  }

  function resetPresentation() {
    currentSlide = 1;
    subStep = 0;
    secondsElapsed = 0;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    renderTimer();
    pauseAllVideos();
    updateView();
  }

  // --- FULLSCREEN HANDLER ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // --- NAVIGATION STATE MACHINE ---
  function nextStep() {
    startTimerIfNeeded();

    const maxSubStep = slideSteps[currentSlide] || 0;
    if (subStep < maxSubStep) {
      subStep++;
      updateView();
    } else if (currentSlide < totalSlides) {
      currentSlide++;
      subStep = 0;
      updateView();
    }
  }

  function prevStep() {
    if (subStep > 0) {
      subStep--;
      updateView();
    } else if (currentSlide > 1) {
      currentSlide--;
      subStep = slideSteps[currentSlide] || 0;
      updateView();
    }
  }

  function goToSlide(slideNum) {
    if (slideNum < 1 || slideNum > totalSlides) return;
    currentSlide = slideNum;
    subStep = 0;
    startTimerIfNeeded();
    updateView();
  }

  // --- VIEW UPDATE COORDINATOR ---
  function updateView() {
    // 1. Update slide visibility
    slides.forEach((s, idx) => {
      const slideNum = idx + 1;
      if (slideNum === currentSlide) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    // 2. Update navigation dots
    dots.forEach((d, idx) => {
      if (idx + 1 === currentSlide) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });

    // 3. Coordinate Slide-specific sub-steps
    switch (currentSlide) {
      case 1:
        updateSlide1();
        break;
      case 2:
        pauseAllVideos();
        updateSlide2();
        break;
      case 3:
        pauseAllVideos();
        updateSlide3();
        break;
      case 4:
        pauseAllVideos();
        updateSlide4();
        break;
      case 5:
        pauseAllVideos();
        updateSlide5();
        break;
    }
  }

  // --- SLIDE 1 HANDLER ---
  function updateSlide1() {
    const vCard1 = document.getElementById('vCard1');
    const vCard2 = document.getElementById('vCard2');
    const vCard3 = document.getElementById('vCard3');
    const climax = document.getElementById('darkClimax');
    const vCards = [vCard1, vCard2, vCard3];

    // Reset all video styling & overlay
    vCards.forEach((c) => c && c.classList.remove('active-playback', 'dimmed'));
    climax.classList.remove('visible');

    if (subStep === 0) {
      pauseAllVideos();
    } else if (subStep === 1) {
      // Play Video 1
      playTargetVideo(vid1);
      vCard1.classList.add('active-playback');
      vCard2.classList.add('dimmed');
      vCard3.classList.add('dimmed');
    } else if (subStep === 2) {
      // Play Video 2
      playTargetVideo(vid2);
      vCard2.classList.add('active-playback');
      vCard1.classList.add('dimmed');
      vCard3.classList.add('dimmed');
    } else if (subStep === 3) {
      // Play Video 3
      playTargetVideo(vid3);
      vCard3.classList.add('active-playback');
      vCard1.classList.add('dimmed');
      vCard2.classList.add('dimmed');
    } else if (subStep === 4) {
      // Show "Our roads are dark."
      pauseAllVideos();
      climax.classList.add('visible');
    }
  }

  function playTargetVideo(target) {
    videos.forEach((v) => {
      if (!v) return;
      if (v === target) {
        v.currentTime = 0;
        v.muted = isMuted;
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Autoplay prevented or pending user action:', err);
          });
        }
      } else {
        v.pause();
      }
    });
  }

  function pauseAllVideos() {
    videos.forEach((v) => {
      if (v && !v.paused) v.pause();
    });
  }

  // --- SLIDE 2 HANDLER (STATS COUNTER) ---
  function updateSlide2() {
    // Animate numbers up
    animateCounter('statCountAccidents', 142, '', 1000);
    animateCounter('statCountDeaths', 1014, '+', 1200);
    animateCounter('statCountData', 37690, ' TB', 1200);
    animateCounter('statCountCameras', 20, ' Spots', 1000);
  }

  function animateCounter(elementId, targetValue, suffix = '', duration = 1200) {
    const el = document.getElementById(elementId);
    if (!el || el.dataset.animated === 'true') return;

    el.dataset.animated = 'true';
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeVal = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.floor(easeVal * targetValue);
      el.textContent = current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = targetValue.toLocaleString() + suffix;
      }
    }
    requestAnimationFrame(frame);
  }

  // --- SLIDE 3 HANDLER ---
  function updateSlide3() {
    const catCard = document.getElementById('caterpillarCard');
    const pillarsOverlay = document.getElementById('pillarsOverlay');

    if (subStep === 0) {
      catCard.classList.remove('show');
      pillarsOverlay.classList.remove('show');
    } else if (subStep === 1) {
      catCard.classList.add('show');
      pillarsOverlay.classList.remove('show');
    } else if (subStep === 2) {
      catCard.classList.add('show');
      pillarsOverlay.classList.add('show');
    }
  }

  // --- SLIDE 4 HANDLER ---
  function updateSlide4() {
    const qrView = document.getElementById('qrPrototypeView');
    const screensView = document.getElementById('screenshotsView');

    if (subStep === 0 || subStep === 1) {
      qrView.style.opacity = '1';
      qrView.style.visibility = 'visible';
      screensView.classList.remove('show');
    } else if (subStep === 2) {
      qrView.style.opacity = '0';
      qrView.style.visibility = 'hidden';
      screensView.classList.add('show');
    }
  }

  // --- SLIDE 5 HANDLER ---
  function updateSlide5() {
    const askStage = document.getElementById('askStage');
    const nustSolo = document.getElementById('nustSoloOverlay');
    const teamFinal = document.getElementById('teamFinalOverlay');

    if (subStep === 0) {
      askStage.style.opacity = '1';
      askStage.style.visibility = 'visible';
      nustSolo.classList.remove('show');
      teamFinal.classList.remove('show');

      animateCounter('askCounter', 4000, '', 1000);
    } else if (subStep === 1) {
      askStage.style.opacity = '0';
      askStage.style.visibility = 'hidden';
      nustSolo.classList.add('show');
      teamFinal.classList.remove('show');
    } else if (subStep === 2) {
      askStage.style.opacity = '0';
      askStage.style.visibility = 'hidden';
      nustSolo.classList.remove('show');
      teamFinal.classList.add('show');
    }
  }

  // --- KEYBOARD LISTENERS ---
  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Advance keys
      if (['ArrowDown', 'ArrowRight', 'Enter', ' ', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        nextStep();
      }
      // Previous keys
      else if (['ArrowUp', 'ArrowLeft', 'Backspace', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        prevStep();
      }
      // Direct jump keys
      else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        goToSlide(parseInt(e.key, 10));
      }
      // Fullscreen
      else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
      // Reset
      else if (e.key.toLowerCase() === 'r') {
        resetPresentation();
      }
      // Quick jump to "Our roads are dark"
      else if (e.key.toLowerCase() === 't') {
        currentSlide = 1;
        subStep = 4;
        updateView();
      }
      // Mute audio
      else if (e.key.toLowerCase() === 'm') {
        toggleAudio();
      }
    });

    // Touch / Swipe Navigation for mobile & tablets
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(diffX) > 40 || Math.abs(diffY) > 40) {
        if (diffX < -40 || diffY < -40) {
          nextStep();
        } else if (diffX > 40 || diffY > 40) {
          prevStep();
        }
      }
    }, { passive: true });
  }

  function toggleAudio() {
    isMuted = !isMuted;
    videos.forEach((v) => {
      if (v) v.muted = isMuted;
    });
    btnAudio.innerHTML = isMuted
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  }

  // --- BUTTON CONTROLLERS ---
  function setupButtonListeners() {
    btnNext.addEventListener('click', nextStep);
    btnPrev.addEventListener('click', prevStep);
    btnFullscreen.addEventListener('click', toggleFullscreen);
    btnAudio.addEventListener('click', toggleAudio);
    btnReset.addEventListener('click', resetPresentation);

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.slide, 10);
        goToSlide(target);
      });
    });
  }

  // --- BACKGROUND PARTICLES ---
  function setupParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();

        // Connect nearby particles with subtle faint lines
        for (let j = i + 1; j < count; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 * (1 - dist / 110)})`;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- V2X HIGHWAY MESH CANVAS (SLIDE 3) ---
  function setupMeshHighwayCanvas() {
    const canvas = document.getElementById('meshHighwayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let cw = (canvas.width = canvas.parentElement.clientWidth);
    let ch = (canvas.height = canvas.parentElement.clientHeight);

    window.addEventListener('resize', () => {
      if (!canvas.parentElement) return;
      cw = canvas.width = canvas.parentElement.clientWidth;
      ch = canvas.height = canvas.parentElement.clientHeight;
    });

    // 3 Cars moving along highway
    const cars = [
      { id: 'BUS-01 (Kudzanayi)', x: cw * 0.18, speed: 1.2, color: '#f43f5e', isBus: true },
      { id: 'CAR-02 (Relay Node)', x: cw * 0.48, speed: 1.5, color: '#10b981', isBus: false },
      { id: 'CAR-03 (Relay Node)', x: cw * 0.76, speed: 1.3, color: '#38bdf8', isBus: false }
    ];

    // Data packet animations
    let packetT = 0;

    function renderMesh() {
      ctx.clearRect(0, 0, cw, ch);

      const roadY = ch * 0.58;
      const roadH = ch * 0.28;

      // Draw Highway Tarmac
      ctx.fillStyle = '#0b111e';
      ctx.fillRect(0, roadY, cw, roadH);

      // Highway Edges
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(cw, roadY);
      ctx.moveTo(0, roadY + roadH);
      ctx.lineTo(cw, roadY + roadH);
      ctx.stroke();

      // Dashed Center Divider
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, roadY + roadH / 2);
      ctx.lineTo(cw, roadY + roadH / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dead Zone Indicators
      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.fillRect(0, 0, cw * 0.72, ch);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.font = '11px JetBrains Mono';
      ctx.fillText('📡 ZERO CELLULAR COVERAGE (SHANGANI DEAD ZONE)', 20, 26);

      // Connected Roadside Node (e.g. Tollgate)
      const tollgateX = cw * 0.92;
      const tollgateY = roadY - 35;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(tollgateX, tollgateY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Outfit';
      ctx.fillText('ZINARA TOLLGATE', tollgateX - 44, tollgateY - 14);
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = '#10b981';
      ctx.fillText('⚡ BACKBONE LINK', tollgateX - 44, tollgateY + 22);

      // Update & Draw Vehicles
      cars.forEach((car, idx) => {
        car.x += car.speed * 0.4;
        if (car.x > cw - 80) car.x = 40;

        const cy = roadY + (idx % 2 === 0 ? roadH * 0.28 : roadH * 0.72);

        // Vehicle Headlights
        const grad = ctx.createRadialGradient(car.x + 30, cy, 5, car.x + 80, cy, 60);
        grad.addColorStop(0, 'rgba(255, 255, 200, 0.35)');
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(car.x + 25, cy - 8);
        ctx.lineTo(car.x + 90, cy - 25);
        ctx.lineTo(car.x + 90, cy + 25);
        ctx.lineTo(car.x + 25, cy + 8);
        ctx.fill();

        // Vehicle Body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        if (car.isBus) {
          ctx.roundRect(car.x - 25, cy - 12, 50, 24, 6);
        } else {
          ctx.roundRect(car.x - 18, cy - 10, 36, 20, 4);
        }
        ctx.fill();

        // Label above car
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(car.id, car.x - 30, cy - 18);

        // Vehicle Wi-Fi / LoRa Radius Rings
        ctx.strokeStyle = `rgba(56, 189, 248, 0.25)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(car.x, cy, 70, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw P2P Mesh Data Link Beams between consecutive cars
      packetT = (packetT + 0.015) % 1;
      for (let i = 0; i < cars.length - 1; i++) {
        const c1 = cars[i];
        const c2 = cars[i + 1];
        const y1 = roadY + (i % 2 === 0 ? roadH * 0.28 : roadH * 0.72);
        const y2 = roadY + ((i + 1) % 2 === 0 ? roadH * 0.28 : roadH * 0.72);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(c1.x, y1);
        ctx.lineTo(c2.x, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated hopping pulse
        const px = c1.x + (c2.x - c1.x) * packetT;
        const py = y1 + (y2 - y1) * packetT;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Final Hop to Tollgate
      const lastCar = cars[cars.length - 1];
      const ly = roadY + ((cars.length - 1) % 2 === 0 ? roadH * 0.28 : roadH * 0.72);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(lastCar.x, ly);
      ctx.lineTo(tollgateX, tollgateY);
      ctx.stroke();
      ctx.setLineDash([]);

      requestAnimationFrame(renderMesh);
    }

    renderMesh();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
