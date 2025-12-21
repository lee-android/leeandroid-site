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

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  /* ===========================
     Safari/iOS Autoplay Fix
  =========================== */

  function attemptAutoplay() {
    video.muted = true;
    video.playsInline = true;
    
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked - add click handler to start
        const startPlayback = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', startPlayback);
          document.removeEventListener('touchstart', startPlayback);
        };
        document.addEventListener('click', startPlayback, { once: true });
        document.addEventListener('touchstart', startPlayback, { once: true });
      });
    }
  }

  /* ===========================
     Perceptual volume curve
  =========================== */

  const perceptualVolume = v => {
    const val = parseFloat(v);
    if (val <= 0) return 0;
    if (val >= 1) return 1;
    // More aggressive curve for mobile to prevent "all or nothing" volume
    // iOS needs a stronger curve due to hardware audio characteristics
    const exponent = (isIOS || isSafari) ? 2.8 : 2.2;
    return Math.pow(val, exponent);
  };

  /* ===========================
     Slider labels
  =========================== */

  const sliderIds = [
    'videoVol',
    'rumbleVol',
    'crackleVol',
    'snowVol',
    'tapeVol',
    'musicVol'
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

  function setSlider(id, value) {
    const slider = document.getElementById(id);
    if (slider) {
      slider.value = value;
      updateSliderLabel(slider);
    }
  }

  function set(media, value) {
    const pv = perceptualVolume(Math.max(0, Math.min(1, value)));
    if (pv <= 0) {
      stopFade(media);
      media.volume = 0;
      if (media !== video) {
        try { media.pause(); } catch {}
      }
      return;
    }
    if (media.paused && media !== video) {
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

    const videoVal = read('videoVol');
    const pv = perceptualVolume(videoVal);
    video.muted = pv <= 0;
    video.volume = pv;
  }

  /* ===========================
   Presets
=========================== */

const PRESETS = {
  videoOnly: {
    videoVol: 0.5,
    rumbleVol: 0,
    crackleVol: 0,
    snowVol: 0,
    tapeVol: 0,
    musicVol: 0
  },
  cozy: {
    videoVol: 0.25,
    rumbleVol: 0.5,
    crackleVol: 0.45,
    snowVol: 0.2,
    tapeVol: 0.1,
    musicVol: 0.15
  },
  lofi: {
    videoVol: 0,
    rumbleVol: 0.3,
    crackleVol: 0.2,
    snowVol: 0.35,
    tapeVol: 0.25,
    musicVol: 0.4
  },
  fireplace: {
    videoVol: 0,
    rumbleVol: 0.6,
    crackleVol: 0.55,
    snowVol: 0,
    tapeVol: 0.05,
    musicVol: 0
  }
};

function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return;

  Object.entries(preset).forEach(([id, value]) => {
    setSlider(id, value);
  });

  setAllVolumesLive();
}

// Dropdown handler
const presetSelect = document.getElementById('presetSelect');
if (presetSelect) {
  presetSelect.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });
}

  function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;

    Object.entries(preset).forEach(([id, value]) => {
      setSlider(id, value);
    });

    setAllVolumesLive();
  }

  // Attach preset button handlers
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  /* ===========================
     Fireplace toggles
  =========================== */

  function enableFireplace() {
    fireplaceEnabled = true;

    fireToggle.closest('.fireplacePanel')?.classList.add('fire-on');

    sliders.classList.remove('hidden');
    requestAnimationFrame(() => sliders.classList.remove('is-hidden'));
    sliders.setAttribute('aria-hidden', 'false');
    fireToggle.textContent = 'Disable Cozy Sounds';

    // Apply default preset (video only)
    applyPreset('videoOnly');

    // Start audio elements (they'll be at 0 volume until slider moved)
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
    fireToggle.textContent = 'Enable Cozy Sounds';

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
    duration: 5556,
    poster: 'imgs/posters/glitchmas-story.gif',
    posterStill: 'imgs/posters/glitchmas-story-still.jpg'
  },
  {
    title: 'Grinch Stole Grinchmas',
    src: 'https://vz-b741991d-4ed.b-cdn.net/9b7d2aec-4eb0-47a2-9922-2abd26097a1c/playlist.m3u8',
    duration: 4886,
    poster: 'imgs/posters/grinch.gif',
    posterStill: 'imgs/posters/grinch-still.jpg'
  },
  {
    // Placeholder - Program 3
    title: 'Program 3',
    src: '',
    duration: 3600,
    poster: 'https://placehold.co/320x240/1a1a1a/666?text=Coming+Soon',
    posterStill: 'https://placehold.co/320x240/1a1a1a/444?text=Program+3'
  },
  {
    // Placeholder - Program 4
    title: 'Program 4',
    src: '',
    duration: 3600,
    poster: 'https://placehold.co/320x240/1a1a1a/666?text=Coming+Soon',
    posterStill: 'https://placehold.co/320x240/1a1a1a/444?text=Program+4'
  }
];

const BROADCAST_START = new Date('2024-12-24T18:00:00-06:00').getTime();
const TOTAL_DURATION = PROGRAMS.reduce((sum, p) => sum + p.duration, 0);

let currentProgramIndex = 0;

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

/* ===========================
   Schedule Panel Sync
=========================== */

const SCHEDULE_LABELS = ['Up Next', 'After That', 'Then'];

function getUpcomingPrograms(currentIndex) {
  const upcoming = [];
  for (let i = 1; i <= 3; i++) {
    const idx = (currentIndex + i) % PROGRAMS.length;
    upcoming.push(PROGRAMS[idx]);
  }
  return upcoming;
}

function updateSchedulePanel(currentIndex) {
  const posters = document.querySelectorAll('#scheduleCarousel .poster');
  const upcoming = getUpcomingPrograms(currentIndex);

  posters.forEach((poster, i) => {
    const program = upcoming[i];
    if (!program) return;

    // Update images
    const mainImg = poster.querySelector('img:not(.poster-still)');
    const stillImg = poster.querySelector('.poster-still');
    
    if (mainImg) mainImg.src = program.poster;
    if (stillImg) stillImg.src = program.posterStill;

    // Update or create label
    let label = poster.querySelector('.poster-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'poster-label';
      poster.appendChild(label);
    }
    label.textContent = SCHEDULE_LABELS[i];

    // Update data attribute for accessibility
    poster.setAttribute('data-title', program.title);
  });
}

/* ===========================
   Program Loading
=========================== */

function loadProgram(program, offsetSeconds) {
  video.muted = true;
  video.volume = 0;

  // Update page title to reflect current program
  document.querySelector('.videoPanel .title').textContent = program.title;
  
  // Update window header "Now Playing" with program title
  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  if (nowPlayingTitle) {
    nowPlayingTitle.textContent = program.title;
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = program.src;
    video.addEventListener(
      'loadedmetadata',
      () => {
        try { video.currentTime = offsetSeconds; } catch {}
        attemptAutoplay();
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
      attemptAutoplay();
    });
  }

  setTimeout(attemptAutoplay, 600);
  
  // Sync schedule panel
  updateSchedulePanel(currentProgramIndex);
}

// Initial load
const { program, offset, index } = getLiveProgram();
currentProgramIndex = index;
loadProgram(program, offset);

/* ===========================
   Program Advancement
=========================== */

function loadNextProgram() {
  currentProgramIndex = (currentProgramIndex + 1) % PROGRAMS.length;
  const next = PROGRAMS[currentProgramIndex];
  loadProgram(next, 0);
}

video.addEventListener('ended', loadNextProgram);

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

  if (ghostCursor) {
    const initX = Math.random() * (window.innerWidth - 50);
    const initY = Math.random() * (window.innerHeight - 50);
    
    ghostCursor.style.left = initX + 'px';
    ghostCursor.style.top = initY + 'px';

    function moveGhostCursor() {
      const padding = 30;
      const cursorSize = 20;
      const maxX = window.innerWidth - padding - cursorSize;
      const maxY = window.innerHeight - padding - cursorSize;
      
      const newX = padding + Math.random() * (maxX - padding);
      const newY = padding + Math.random() * (maxY - padding);
      
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

    window.addEventListener('resize', () => {
      const rect = ghostCursor.getBoundingClientRect();
      if (rect.left > window.innerWidth || rect.top > window.innerHeight) {
        moveGhostCursor();
      }
    });
  }
});