/**
 * ZIMKNOWS PITCH DECK ENGINE
 * Precision choreography, low-latency video switching, top-down V2X caterpillar mesh simulation.
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
    3: 2, // 0: Top-down Mesh animation, 1: Caterpillar reveal, 2: 4 Pillars & Quote
    4: 2, // 0: Dead zones intro, 1: QR code, 2: System screenshots
    5: 2  // 0: Pathway & Sandboxes, 1: NUST solo reveal, 2: Team & final QR
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

    // 3. Fallback: Check if any slide is marked 'active' in DOM
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
      playTargetVideo(vid1);
      vCard1.classList.add('active-playback');
      vCard2.classList.add('dimmed');
      vCard3.classList.add('dimmed');
    } else if (subStep === 2) {
      playTargetVideo(vid2);
      vCard2.classList.add('active-playback');
      vCard1.classList.add('dimmed');
      vCard3.classList.add('dimmed');
    } else if (subStep === 3) {
      playTargetVideo(vid3);
      vCard3.classList.add('active-playback');
      vCard1.classList.add('dimmed');
      vCard2.classList.add('dimmed');
    } else if (subStep === 4) {
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
      const easeVal = 1 - Math.pow(1 - progress, 3);
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
  let triggerMeshResize = null;

  function updateSlide3() {
    const catCard = document.getElementById('caterpillarCard');
    const pillarsOverlay = document.getElementById('pillarsOverlay');

    // Trigger canvas size recheck immediately when Slide 3 becomes active
    if (triggerMeshResize) {
      setTimeout(triggerMeshResize, 50);
    }

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
    const count = 40;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.15
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

        for (let j = i + 1; j < count; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.12 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- TOP-DOWN V2X HIGHWAY CATERPILLAR MESH CANVAS (SLIDE 3) ---
  function setupMeshHighwayCanvas() {
    const canvas = document.getElementById('meshHighwayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    let cw = 0;
    let ch = 0;

    function resizeCanvas() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width) || container.clientWidth || 1000;
      const h = Math.floor(rect.height) || container.clientHeight || 300;
      if (w > 50 && h > 50 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = cw = w;
        canvas.height = ch = h;
      }
    }

    triggerMeshResize = resizeCanvas;
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    if (window.ResizeObserver) {
      new ResizeObserver(() => resizeCanvas()).observe(container);
    }

    // Top-down vehicles cruising along the highway
    const vehicles = [
      {
        id: 'KUDZANAYI BUS',
        sub: 'Distress Origin (Offline)',
        x: 120,
        lane: 0, // top lane (eastbound)
        speed: 1.1,
        length: 64,
        width: 24,
        color: '#f43f5e',
        glowColor: 'rgba(244, 63, 94, 0.4)',
        isBus: true
      },
      {
        id: 'V2X RELAY 01',
        sub: 'Local Mesh Hop',
        x: 380,
        lane: 0,
        speed: 1.35,
        length: 44,
        width: 20,
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.4)',
        isBus: false
      },
      {
        id: 'V2X RELAY 02',
        sub: 'Oncoming Hauler Hop',
        x: 660,
        lane: 1, // bottom lane (westbound)
        speed: -1.2,
        length: 48,
        width: 21,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        isBus: false
      },
      {
        id: 'V2X RELAY 03',
        sub: 'Commuter Car Hop',
        x: 920,
        lane: 0,
        speed: 1.4,
        length: 42,
        width: 19,
        color: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.4)',
        isBus: false
      }
    ];

    let packetPhase = 0;

    // Helper: Draw Top-Down Vehicle matching reference image
    function drawTopDownVehicle(v, cx, cy) {
      ctx.save();
      ctx.translate(cx, cy);

      const angle = v.speed >= 0 ? 0 : Math.PI;
      ctx.rotate(angle);

      const l = v.length;
      const w = v.width;

      // Glow halo
      ctx.shadowColor = v.color;
      ctx.shadowBlur = 10;

      // Chassis Body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-l / 2, -w / 2, l, w, [6, 10, 10, 6]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Side mirrors (protruding just like reference)
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.ellipse(l * 0.16, -w / 2 - 3, 3, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(l * 0.16, w / 2 + 3, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front Curved Windshield
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.roundRect(l * 0.08, -w * 0.35, l * 0.18, w * 0.7, [2, 6, 6, 2]);
      ctx.fill();

      // Center Cabin Roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-l * 0.22, -w * 0.35, l * 0.26, w * 0.7, 2);
      ctx.fill();

      // Rear Window
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.roundRect(-l * 0.38, -w * 0.32, l * 0.13, w * 0.64, 2);
      ctx.fill();

      // Headlights (Twin forward beams)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(l / 2 - 2, -w * 0.33, 2, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(l / 2 - 2, w * 0.33, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Taillights (Twin red rear lights)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(-l / 2 + 2, -w * 0.33, 2, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(-l / 2 + 2, w * 0.33, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Vehicle HUD Tag (Always upright)
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Outfit';
      ctx.fillText(v.id, cx - 35, cy - v.width - 12);

      ctx.fillStyle = v.color;
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(v.sub, cx - 35, cy - v.width - 2);

      // Local Mesh Radio Radius Ring
      ctx.strokeStyle = v.glowColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function renderMesh() {
      if (cw === 0 || ch === 0) {
        resizeCanvas();
      }

      ctx.clearRect(0, 0, cw, ch);

      const roadY = ch * 0.48;
      const laneH = 55;
      const roadH = laneH * 2;
      const lane0Y = roadY + laneH * 0.5;
      const lane1Y = roadY + laneH * 1.5;

      // Road Surface
      ctx.fillStyle = '#0b111e';
      ctx.fillRect(0, roadY, cw, roadH);

      // Solid Outer Road Boundary Lines
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(cw, roadY);
      ctx.moveTo(0, roadY + roadH);
      ctx.lineTo(cw, roadY + roadH);
      ctx.stroke();

      // Dashed Center Divider Line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([24, 18]);
      ctx.beginPath();
      ctx.moveTo(0, roadY + laneH);
      ctx.lineTo(cw, roadY + laneH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dead Zone Watermark
      ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
      ctx.fillRect(0, 0, cw * 0.74, ch);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('⚡ 0% CELLULAR COVERAGE (SHANGANI DEAD ZONE)', 20, 24);

      // Roadside Backbone Node (ZINARA Tollgate / Radio Repeater)
      const beaconX = cw - 80;
      const beaconY = roadY - 45;

      // Beacon Tower Icon & Rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(beaconX, beaconY, 14 + (packetPhase * 10), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(beaconX, beaconY, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Outfit';
      ctx.fillText('ZINARA TOLLGATE', beaconX - 52, beaconY - 14);
      ctx.fillStyle = '#10b981';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText('NEWSROOM UPLINK ↗', beaconX - 52, beaconY + 22);

      // Update Vehicle Positions
      vehicles.forEach((v) => {
        v.x += v.speed * 0.6;
        if (v.speed > 0 && v.x > cw - 120) v.x = 40;
        if (v.speed < 0 && v.x < 40) v.x = cw - 140;

        const cy = v.lane === 0 ? lane0Y : lane1Y;
        drawTopDownVehicle(v, v.x, cy);
      });

      // --- DATA CATERPILLAR WAVE HOPPING (BEAMS & PULSES) ---
      packetPhase = (packetPhase + 0.012) % 1;

      // Sort vehicles by X coordinate to form a continuous hop chain
      const sortedVehicles = [...vehicles].sort((a, b) => a.x - b.x);

      // Draw Caterpillar Arcs between consecutive nodes
      for (let i = 0; i < sortedVehicles.length - 1; i++) {
        const vA = sortedVehicles[i];
        const vB = sortedVehicles[i + 1];
        const yA = vA.lane === 0 ? lane0Y : lane1Y;
        const yB = vB.lane === 0 ? lane0Y : lane1Y;

        // Curved Caterpillar Arch
        const midX = (vA.x + vB.x) / 2;
        const midY = Math.min(yA, yB) - 35;

        // Glowing Caterpillar Body Arc
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(vA.x, yA);
        ctx.quadraticCurveTo(midX, midY, vB.x, yB);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated hopping pulse along quadratic curve
        const t = (packetPhase + i * 0.25) % 1;
        const px = Math.pow(1 - t, 2) * vA.x + 2 * (1 - t) * t * midX + Math.pow(t, 2) * vB.x;
        const py = Math.pow(1 - t, 2) * yA + 2 * (1 - t) * t * midY + Math.pow(t, 2) * yB;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hop latency tag
        if (i === 1) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.font = '9px JetBrains Mono';
          ctx.fillText('HOP 2: 14ms (P2P)', midX - 35, midY - 6);
        }
      }

      // Final Hop: Last vehicle to Tollgate Node
      const lastV = sortedVehicles[sortedVehicles.length - 1];
      const lastY = lastV.lane === 0 ? lane0Y : lane1Y;

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lastV.x, lastY);
      ctx.quadraticCurveTo((lastV.x + beaconX) / 2, roadY - 50, beaconX, beaconY);
      ctx.stroke();
      ctx.setLineDash([]);

      const tFinal = (packetPhase + 0.75) % 1;
      const bMidX = (lastV.x + beaconX) / 2;
      const bMidY = roadY - 50;
      const fpx = Math.pow(1 - tFinal, 2) * lastV.x + 2 * (1 - tFinal) * tFinal * bMidX + Math.pow(tFinal, 2) * beaconX;
      const fpy = Math.pow(1 - tFinal, 2) * lastY + 2 * (1 - tFinal) * tFinal * bMidY + Math.pow(tFinal, 2) * beaconY;

      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(fpx, fpy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
