document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('glitchmasVideo');
  const fireToggle = document.getElementById('fireToggle');
  const sliders = document.getElementById('sliders');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (!video || !fireToggle || !sliders) return;

  /* ===========================
     Video fade-in
  =========================== */

  video.addEventListener(
    'loadeddata',
    () => {
      setTimeout(() => video.classList.add('is-ready'), 120);
    },
    { once: true }
  );

  /* ===========================
     Platform detection
  =========================== */

  const isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ===========================
     Perceptual volume curve
  =========================== */

  const perceptualVolume = v => (v <= 0 ? 0 : Math.pow(v, 2));

  /* ===========================
     Slider labels
  =========================== */

  const sliderIds = [
    'rumbleVol',
    'crackleVol',
    'snowVol',
    'tapeVol',
    'musicVol',
    'videoVol'
  ];

  function updateSliderLabel(slider) {
    const percent = Math.round(parseFloat(slider.value) * 100);
    slider.closest('.slider')?.setAttribute('data-val', percent + '%');
  }

  sliderIds.forEach(id => {
    const s = document.getElementById(id);
    if (!s) return;
    updateSliderLabel(s);
    s.addEventListener('input', () => updateSliderLabel(s));
  });

  /* ===========================
     Slider visibility
  =========================== */

  sliders.classList.add('hidden', 'is-hidden');
  sliders.setAttribute('aria-hidden', 'true');

  /* ===========================
     Fireplace audio layers
  =========================== */

  const audioMap = {
    fire: new Audio('/audio/fire.mp3'),
    crackle: new Audio('/audio/crackle.mp3'),
    snowfall: new Audio('/audio/snowfall.mp3'),
    tape: new Audio('/audio/tape-noise.mp3'),
    music: new Audio('/audio/xmas-music.mp3')
  };

  Object.values(audioMap).forEach(a => {
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
  });

  function randomizeStart(audio, tail = 5) {
    const set = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const max = Math.max(0, audio.duration - tail);
      try { audio.currentTime = Math.random() * max; } catch {}
    };
    audio.addEventListener('loadedmetadata', set);
    audio.addEventListener('canplay', set, { once: true });
  }

  Object.values(audioMap).forEach(randomizeStart);

  /* ===========================
     Volume helpers
  =========================== */

  let fireplaceEnabled = false;
  const fades = new Map();

  function stopFade(media) {
    const id = fades.get(media);
    if (id) clearInterval(id);
    fades.delete(media);
  }

  function fadeTo(media, target, step = 0.02, interval = 60) {
    stopFade(media);
    const t = Math.max(0, Math.min(1, target));

    const id = setInterval(() => {
      const cur = media.volume ?? 0;
      const next = cur + (cur < t ? step : -step);
      media.volume = Math.max(0, Math.min(1, next));

      if (Math.abs(media.volume - t) <= step) {
        media.volume = t;
        stopFade(media);
        if (t === 0 && media !== video) {
          try { media.pause(); } catch {}
        }
      }
    }, interval);

    fades.set(media, id);
  }

  const read = id => parseFloat(document.getElementById(id)?.value || 0);

  function set(media, value) {
    const pv = perceptualVolume(Math.max(0, Math.min(1, value)));
    if (pv <= 0) {
      stopFade(media);
      media.volume = 0;
      try { media.pause(); } catch {}
      return;
    }
    if (media.paused) {
      try { media.play(); } catch {}
    }
    media.volume = pv;
  }

  function setAllVolumesLive() {
    if (!fireplaceEnabled) return;

    set(audioMap.fire, read('rumbleVol'));
    set(audioMap.crackle, read('crackleVol'));
    set(audioMap.snowfall, read('snowVol'));
    set(audioMap.tape, read('tapeVol'));
    set(audioMap.music, read('musicVol'));

    const pv = perceptualVolume(read('videoVol'));
    video.muted = pv <= 0;
    video.volume = pv;
  }

  /* ===========================
     Fireplace toggles
  =========================== */

  function enableFireplace() {
    fireplaceEnabled = true;

    fireToggle.closest('.fireplacePanel')?.classList.add('fire-on');

    sliders.classList.remove('hidden');
    requestAnimationFrame(() => sliders.classList.remove('is-hidden'));
    sliders.setAttribute('aria-hidden', 'false');
    fireToggle.textContent = 'Disable Fireplace Sounds';

    Object.values(audioMap).forEach(a => a.play().catch(() => {}));
    setAllVolumesLive();
  }

  function disableFireplace() {
    fireplaceEnabled = false;

    fireToggle.closest('.fireplacePanel')?.classList.remove('fire-on');

    Object.values(audioMap).forEach(a => fadeTo(a, 0, 0.04, 40));
    fadeTo(video, 0, 0.04, 40);

    setTimeout(() => {
      Object.values(audioMap).forEach(a => {
        try { a.pause(); } catch {}
        a.volume = 0;
      });
      video.muted = true;
      video.volume = 0;
    }, 260);

    sliders.classList.add('is-hidden');
    sliders.setAttribute('aria-hidden', 'true');
    fireToggle.textContent = 'Enable Fireplace Sounds';

    setTimeout(() => sliders.classList.add('hidden'), 220);
  }

  fireToggle.addEventListener('click', () =>
    fireplaceEnabled ? disableFireplace() : enableFireplace()
  );

  sliderIds.forEach(id =>
    document.getElementById(id)?.addEventListener('input', setAllVolumesLive)
  );

  /* ===========================
     Fullscreen
  =========================== */

  if (isIOS) {
    video.addEventListener(
      'touchstart',
      () => {
        if (video.webkitEnterFullscreen) {
          try { video.webkitEnterFullscreen(); } catch {}
        }
      },
      { passive: true }
    );
  }

  fullscreenBtn?.addEventListener('click', () => {
    if (isIOS) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  });

  video.addEventListener('contextmenu', e => e.preventDefault());

  /* ===========================
     SINGLE CHANNEL BROADCAST
  =========================== */

  const PROGRAMS = [
    {
      title: 'A Glitchmas Story',
      src: 'https://vz-b741991d-4ed.b-cdn.net/dd768fbf-0260-4d51-9e01-98cd864edf1c/playlist.m3u8',
      duration: 5556
    },
    {
      title: 'Grinch Stole Grinchmas',
      src: 'https://vz-b741991d-4ed.b-cdn.net/9b7d2aec-4eb0-47a2-9922-2abd26097a1c/playlist.m3u8',
      duration: 4886
    }
  ];

  const BROADCAST_START = new Date('2024-12-24T18:00:00-06:00').getTime();
  const TOTAL_DURATION = PROGRAMS.reduce((sum, p) => sum + p.duration, 0);

  function getLiveProgram() {
    let elapsed = Math.floor((Date.now() - BROADCAST_START) / 1000);
    if (elapsed < 0) elapsed = 0;
    elapsed = TOTAL_DURATION ? elapsed % TOTAL_DURATION : 0;

    let index = 0;
    for (const p of PROGRAMS) {
      if (elapsed < p.duration) return { program: p, offset: elapsed, index };
      elapsed -= p.duration;
      index++;
    }

    return { program: PROGRAMS[0], offset: 0, index: 0 };
  }

  function loadProgram(program, offsetSeconds) {
    video.muted = true;
    video.volume = 0;

    const attemptPlay = () => video.play().catch(() => {});

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = program.src;
      video.addEventListener(
        'loadedmetadata',
        () => {
          try { video.currentTime = offsetSeconds; } catch {}
          attemptPlay();
        },
        { once: true }
      );
    } else if (window.Hls && Hls.isSupported()) {
      if (window.hlsInstance) {
        window.hlsInstance.destroy();
      }
      const hls = new Hls({ enableWorker: true });
      window.hlsInstance = hls;
      hls.loadSource(program.src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        try { video.currentTime = offsetSeconds; } catch {}
        attemptPlay();
      });
    }

    setTimeout(attemptPlay, 600);
  }

  const { program, offset, index } = getLiveProgram();
  let currentProgramIndex = index;
  loadProgram(program, offset);

  /* ===========================
     Program advancement
  =========================== */

  function loadNextProgram() {
    currentProgramIndex = (currentProgramIndex + 1) % PROGRAMS.length;
    const next = PROGRAMS[currentProgramIndex];
    loadProgram(next, 0);
  }

  video.addEventListener('ended', loadNextProgram);

  /* ===========================
     Schedule Carousel (Mobile)
  =========================== */

  const carousel = document.getElementById('scheduleCarousel');
  const dots = document.querySelectorAll('.carousel-dot');
  const posters = carousel ? carousel.querySelectorAll('.poster') : [];
  const posterCount = posters.length;

  if (carousel && dots.length && posterCount > 0) {
    let currentSlide = 0;
    let autoRotateInterval = null;
    let userInteracting = false;
    const AUTO_ROTATE_DELAY = 5000;
    const INTERACTION_PAUSE = 8000;

    // Reset scroll position to first slide on load
    carousel.scrollLeft = 0;

    function updateDots(index) {
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    function goToSlide(index) {
      const width = carousel.offsetWidth;
      carousel.scrollTo({ left: index * width, behavior: 'smooth' });
      currentSlide = index;
      updateDots(index);
    }

    function nextSlide() {
      const next = (currentSlide + 1) % posterCount;
      goToSlide(next);
    }

    function startAutoRotate() {
      stopAutoRotate();
      autoRotateInterval = setInterval(() => {
        if (!userInteracting) {
          nextSlide();
        }
      }, AUTO_ROTATE_DELAY);
    }

    function stopAutoRotate() {
      if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
      }
    }

    function handleUserInteraction() {
      userInteracting = true;
      stopAutoRotate();

      setTimeout(() => {
        userInteracting = false;
        startAutoRotate();
      }, INTERACTION_PAUSE);
    }

    carousel.addEventListener('scroll', () => {
      const scrollLeft = carousel.scrollLeft;
      const width = carousel.offsetWidth;
      const index = Math.round(scrollLeft / width);

      if (index !== currentSlide && index >= 0 && index < posterCount) {
        currentSlide = index;
        updateDots(index);
      }
    });

    carousel.addEventListener('touchstart', handleUserInteraction, { passive: true });
    carousel.addEventListener('mousedown', handleUserInteraction);

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        handleUserInteraction();
        const index = parseInt(dot.dataset.index, 10);
        goToSlide(index);
      });
    });

    updateDots(0);
    startAutoRotate();
  }

  /* ===========================
     Ghost Cursor Animation
  =========================== */

  const ghostCursor = document.querySelector('.ghost-cursor');

  if (ghostCursor && window.innerWidth > 899) {
    let cursorX = Math.random() * (window.innerWidth - 100);
    let cursorY = Math.random() * (window.innerHeight - 100);
    
    ghostCursor.style.left = cursorX + 'px';
    ghostCursor.style.top = cursorY + 'px';

    function moveGhostCursor() {
      const padding = 60;
      const maxX = window.innerWidth - padding;
      const maxY = document.documentElement.scrollHeight - padding;
      
      const newX = padding + Math.random() * (maxX - padding);
      const newY = padding + Math.random() * (Math.min(maxY, window.innerHeight * 1.5) - padding);
      
      ghostCursor.style.left = newX + 'px';
      ghostCursor.style.top = newY + 'px';
    }

    setTimeout(moveGhostCursor, 1000);
    
    function scheduleNextMove() {
      const delay = 3000 + Math.random() * 3000;
      setTimeout(() => {
        moveGhostCursor();
        scheduleNextMove();
      }, delay);
    }
    
    scheduleNextMove();
  }
});