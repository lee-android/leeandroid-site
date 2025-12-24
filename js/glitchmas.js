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

  // Define music playlist from Bunny CDN
  const CDN_BASE = 'https://lagb122425.b-cdn.net';

  // Tracks now live at the CDN root with simplified naming (lowercase, hyphens)
  const MUSIC_FILES = [
    // Snow, Vol. 8 (9 tracks)
    '02-wun-two-the-house-snow-vol.-8.mp3',
    '03-wun-two-peanut-brigade-feat.-eets-snow-vol.-8.mp3',
    '04-wun-two-pine-snow-vol.-8.mp3',
    '05-wun-two-greensleeves-snow-vol.-8.mp3',
    '06-wun-two-snow-telegram-snow-vol.-8.mp3',
    '07-wun-two-ouverture-2-snow-vol.-8.mp3',
    '08-wun-two-glacier-express-snow-vol.-8.mp3',
    '09-wun-two-blue-champagne-snow-vol.-8.mp3',

    // Snow, Vol. 9 (12 tracks)
    '01-wun-two-frore-intro-snow-vol.-9.mp3',
    '02-wun-two-hibernaculums-snow-vol.-9.mp3',
    '03-wun-two-piano-to-snow-to-snow-vol.-9.mp3',
    '04-wun-two-whitetime-snow-vol.-9.mp3',
    '05-wun-two-aboo-the-snow-giant-snow-vol.-9.mp3',
    '06-wun-two-brumal-snow-vol.-9.mp3',
    '07-wun-two-winter-overture-snow-vol.-9.mp3',
    '08-wun-two-riz-snow-snow-vol.-9.mp3',
    '09-wun-two-december-shoes-snow-vol.-9.mp3',
    '10-wun-two-winzlig-snow-vol.-9.mp3',
    '11-wun-two-gelid-snow-vol.-9.mp3',
    '12-wun-two-flakelet-outro-snow-vol.-9.mp3',

    // Snow, Vol. 10 (16 tracks)
    '01-wun-two-schnee-snow-vol.-10.mp3',
    '02-wun-two-holli-snow-vol.-10.mp3',
    '03-wun-two-here-we-are-snow-vol.-10.mp3',
    '04-wun-two-uoy-snow-vol.-10.mp3',
    '05-wun-two-candli-snow-vol.-10.mp3',
    '06-wun-two-snow-drive-snow-vol.-10.mp3',
    '07-wun-two-herbst-snow-vol.-10.mp3',
    '08-wun-two-coldzero-snow-vol.-10.mp3',
    '09-wun-two-laterne-snow-vol.-10.mp3',
    '10-wun-two-minttea-snow-vol.-10.mp3',
    '11-wun-two-bergfrost-snow-vol.-10.mp3',
    '12-wun-two-tog-snow-vol.-10.mp3',
    '13-wun-two-schneesturm-snow-vol.-10.mp3',
    '14-wun-two-katz-snow-vol.-10.mp3',
    '15-wun-two-heimo-snow-vol.-10.mp3',
    '16-wun-two-kristallin-snow-vol.-10.mp3'
  ];

  const MUSIC_PLAYLIST = MUSIC_FILES.map(f => `${CDN_BASE}/${f}`);


  // Better randomization using crypto API
  function getRandomValue() {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] / (0xffffffff + 1);
    }
    return Math.random();
  }

  // Get random track, avoiding recently played tracks
  const recentTracks = [];
  const RECENT_LIMIT = 8; // Don't repeat any of the last 8 tracks

  function getRandomTrack() {
    // Filter out recently played tracks
    const availableTracks = MUSIC_PLAYLIST.filter(track => !recentTracks.includes(track));
    
    // If we've somehow played everything, clear history except last track
    if (availableTracks.length === 0) {
      const lastTrack = recentTracks[recentTracks.length - 1];
      recentTracks.length = 0;
      recentTracks.push(lastTrack);
      return getRandomTrack();
    }
    
    // Pick random track from available ones
    const randomIndex = Math.floor(getRandomValue() * availableTracks.length);
    const selectedTrack = availableTracks[randomIndex];
    
    // Add to recent history
    recentTracks.push(selectedTrack);
    if (recentTracks.length > RECENT_LIMIT) {
      recentTracks.shift(); // Remove oldest
    }
    
    return selectedTrack;
  }

  // Start with a random track
  const audioMap = {
    fire: new Audio('/audio/fire.mp3'),
    crackle: new Audio('/audio/crackle.mp3'),
    snowfall: new Audio('/audio/snowfall.mp3'),
    tape: new Audio('/audio/tape-noise.mp3'),
    music: new Audio(getRandomTrack())
  };

  // Set looping for ambient tracks (but NOT music)
  audioMap.fire.loop = true;
  audioMap.crackle.loop = true;
  audioMap.snowfall.loop = true;
  audioMap.tape.loop = true;
  audioMap.music.loop = false; // Music will pick new random track on end

  Object.values(audioMap).forEach(a => {
    a.preload = 'auto';
    a.volume = 0;
  });

  // Handle music track ending - pick new random track
  audioMap.music.addEventListener('ended', () => {
    const nextTrack = getRandomTrack();
    
    audioMap.music.src = nextTrack;
    audioMap.music.load();
    
    // Play from beginning when track loads
    audioMap.music.addEventListener('loadedmetadata', () => {
      if (fireplaceEnabled && read('musicVol') > 0) {
        audioMap.music.play().catch(() => {});
      }
    }, { once: true });
  });

  // Apply randomizeStart only to ambient tracks (fire, crackle, etc)
  function randomizeStart(audio, tail = 5) {
    const set = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const max = Math.max(0, audio.duration - tail);
      try { audio.currentTime = Math.random() * max; } catch {}
    };
    audio.addEventListener('loadedmetadata', set);
    audio.addEventListener('canplay', set, { once: true });
  }

  // Only randomize ambient tracks, not music
  randomizeStart(audioMap.fire);
  randomizeStart(audioMap.crackle);
  randomizeStart(audioMap.snowfall);
  randomizeStart(audioMap.tape);

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

// Dropdown handler (unified handler is below in mobile section)
const presetSelect = document.getElementById('presetSelect');
let currentPreset = 'videoOnly'; // Track current preset

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

    // Sync dropdown to current preset
    if (presetSelect) {
      presetSelect.value = currentPreset;
    }

    // Apply current preset (preserves user's last selection)
    // Use mobile presets on mobile, desktop presets on desktop
    if (window.innerWidth <= 899) {
      if (window.applyMobilePreset) {
        window.applyMobilePreset(currentPreset);
      }
      if (window.syncToggleVisuals) {
        window.syncToggleVisuals();
      }
    } else {
      applyPreset(currentPreset);
    }

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

  fireToggle.addEventListener('click', (e) => {
    e.preventDefault();
    
    // CRITICAL: Unlock audio IMMEDIATELY in the real click handler
    // This must happen before any setTimeout/animation delays
    if (!fireplaceEnabled) {
      // Touch all audio elements to unlock them on first user gesture
      Object.values(audioMap).forEach(a => {
        a.muted = true;
        a.play().then(() => a.pause()).catch(() => {});
        a.muted = false;
      });
    }
    
    const performAction = () => {
      fireplaceEnabled ? disableFireplace() : enableFireplace();
    };
    
    // Move ghost cursor to button and perform action
    ghostCursorClickElement(fireToggle, performAction);
  });

  sliderIds.forEach(id =>
    document.getElementById(id)?.addEventListener('input', setAllVolumesLive)
  );

  /* ===========================
     Mobile Toggles (instead of sliders)
  =========================== */

  // Mobile-specific presets (on/off only, 0.5 when on)
  const MOBILE_PRESETS = {
    videoOnly: {
      videoVol: 0.5,
      rumbleVol: 0,
      crackleVol: 0,
      snowVol: 0,
      tapeVol: 0,
      musicVol: 0
    },
    cozy: {
      videoVol: 0.5,
      rumbleVol: 0.5,
      crackleVol: 0.5,
      snowVol: 0.5,
      tapeVol: 0,
      musicVol: 0.5
    },
    lofi: {
      videoVol: 0,
      rumbleVol: 0,
      crackleVol: 0,
      snowVol: 0,
      tapeVol: 0,
      musicVol: 0.5
    },
    fireplace: {
      videoVol: 0,
      rumbleVol: 0.5,
      crackleVol: 0.5,
      snowVol: 0,
      tapeVol: 0,
      musicVol: 0
    }
  };

  // Apply mobile preset and update toggle visuals
  function applyMobilePreset(presetName) {
    const preset = MOBILE_PRESETS[presetName];
    if (!preset) return;

    document.querySelectorAll('.slider').forEach((slider) => {
      const input = slider.querySelector('input[type="range"]');
      if (!input) return;

      const value = preset[input.id];
      if (value !== undefined) {
        input.value = value;
        
        // Update toggle switch visual state
        if (parseFloat(value) > 0) {
          slider.classList.add('is-on');
        } else {
          slider.classList.remove('is-on');
        }
      }
    });

    setAllVolumesLive();
  }

  // Sync toggle visuals with current slider values
  function syncToggleVisuals() {
    document.querySelectorAll('.slider').forEach(slider => {
      const input = slider.querySelector('input[type="range"]');
      if (!input) return;
      
      if (parseFloat(input.value) > 0) {
        slider.classList.add('is-on');
      } else {
        slider.classList.remove('is-on');
      }
    });
  }

  // Make functions available for enableFireplace
  window.applyMobilePreset = applyMobilePreset;
  window.syncToggleVisuals = syncToggleVisuals;
  window.initializeMobileToggles = syncToggleVisuals; // Alias for compatibility

  // Preset dropdown handler - works for both mobile and desktop
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      currentPreset = e.target.value;
      
      // Check if mobile at time of change
      if (window.innerWidth <= 899) {
        applyMobilePreset(currentPreset);
      } else {
        applyPreset(currentPreset);
      }
    });
  }

  // EVENT DELEGATION: Single click handler on sliders container
  // This works regardless of when elements are created or shown
  sliders.addEventListener('click', (e) => {
    // Only handle on mobile
    if (window.innerWidth > 899) return;
    
    // Find the slider element that was clicked
    const slider = e.target.closest('.slider');
    if (!slider) return;
    
    // Don't interfere with the preset dropdown
    if (e.target.closest('.preset-select-wrap')) return;
    if (e.target.closest('.preset-select-wrap')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const input = slider.querySelector('input[type="range"]');
    if (!input) return;
    
    const isOn = slider.classList.contains('is-on');
    
    if (isOn) {
      slider.classList.remove('is-on');
      input.value = '0';
    } else {
      slider.classList.add('is-on');
      input.value = '0.5';
    }
    
    // Update volume
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('[Mobile] Toggled', input.id, isOn ? 'OFF' : 'ON');
  });

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

// CDN for posters
const POSTER_CDN = 'https://gb--posters.b-cdn.net/';

const PROGRAMS = [
  {
    id: 'xmas_story',
    title: 'A Christmas Story',
    src: 'https://vz-b741991d-4ed.b-cdn.net/dd768fbf-0260-4d51-9e01-98cd864edf1c/playlist.m3u8',
    duration: 5556,
    type: 'family',
    poster: `${POSTER_CDN}ACSGB122425.gif`,
    posterStill: ''
  },
  {
    id: 'grinch_2000',
    title: 'How the Grinch Stole Christmas (2000)',
    src: 'https://vz-b741991d-4ed.b-cdn.net/9b7d2aec-4eb0-47a2-9922-2abd26097a1c/playlist.m3u8',
    duration: 6216,
    type: 'family',
    poster: `${POSTER_CDN}GSCGB122425.gif`,
    posterStill: ''
  },
  {
    id: 'guardians',
    title: 'Rise of the Guardians',
    src: 'https://vz-b741991d-4ed.b-cdn.net/307efe9a-2f32-4585-9574-809aa9db6a4f/playlist.m3u8',
    duration: 5713,
    type: 'family',
    poster: `${POSTER_CDN}ROTGGM122425.gif`,
    posterStill: ''
  },
  {
    id: 'friday_after_next',
    title: 'Friday After Next',
    src: 'https://vz-b741991d-4ed.b-cdn.net/PLACEHOLDER.m3u8', // Add real URL when available
    duration: 5160,
    type: 'mature',
    poster: `${POSTER_CDN}FANGB122425.gif`,
    posterStill: ''
  },
  {
    id: 'bad_santa',
    title: 'Bad Santa',
    src: 'https://vz-b741991d-4ed.b-cdn.net/PLACEHOLDER.m3u8', // Add real URL when available
    duration: 5520,
    type: 'mature',
    poster: `${POSTER_CDN}BSGB122425.gif`,
    posterStill: ''
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
  
  // Schedule panel now handled by time-based overlay system
}
/* ===========================
   Time-of-Day Schedule Overlay (UI ONLY)
   - Clock-based (America/Chicago)
   - Updates Now Playing + next 3 posters
   - Does NOT touch video playback
=========================== */

const GLITCHMAS_TZ = 'America/Chicago';

// Your panel copy says “Replay drops every hour on the hour.”
// This makes the schedule deterministic without needing movie runtimes.
const GLITCHMAS_SLOT_SECONDS = 3600;

// Convert PROGRAMS array to lookup object for schedule system
const PROGRAMS_BY_ID = {};
PROGRAMS.forEach(p => { PROGRAMS_BY_ID[p.id] = p; });

const GLITCHMAS_ROTATIONS = {
  day: ['xmas_story', 'grinch_2000', 'guardians'],                 // 06:00–22:00
  night: ['friday_after_next', 'bad_santa', 'grinch_2000']         // 22:00–06:00
};

function glitchmasGetZonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

// Returns offset minutes between UTC and target timeZone at a given instant
function glitchmasGetTimeZoneOffsetMinutes(date, timeZone) {
  const p = glitchmasGetZonedParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUTC - date.getTime()) / 60000;
}

// Convert a “wall clock” time in timeZone into a UTC timestamp (ms)
function glitchmasZonedTimeToUtcMs({ year, month, day, hour, minute, second }, timeZone) {
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Iterate to converge around DST/offset quirks (usually converges in 1–2 steps)
  let guess = baseUtc;
  for (let i = 0; i < 3; i++) {
    const offsetMin = glitchmasGetTimeZoneOffsetMinutes(new Date(guess), timeZone);
    guess = baseUtc - offsetMin * 60000;
  }
  return guess;
}

function glitchmasComputeWindowStartUtcMs(now, timeZone) {
  const p = glitchmasGetZonedParts(now, timeZone);
  const isDay = p.hour >= 6 && p.hour < 22;

  // Day window starts at 06:00 same day.
  // Night window starts at 22:00 same day, unless it’s after midnight (<06:00),
  // then it started at 22:00 the previous day.
  if (isDay) {
    return glitchmasZonedTimeToUtcMs(
      { year: p.year, month: p.month, day: p.day, hour: 6, minute: 0, second: 0 },
      timeZone
    );
  }

  // Night mode
  if (p.hour >= 22) {
    return glitchmasZonedTimeToUtcMs(
      { year: p.year, month: p.month, day: p.day, hour: 22, minute: 0, second: 0 },
      timeZone
    );
  }

  // After midnight but before 06:00: use previous day's 22:00
  const todayMidnightUtc = glitchmasZonedTimeToUtcMs(
    { year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 },
    timeZone
  );
  const prevDay = new Date(todayMidnightUtc - 24 * 3600 * 1000);
  const prev = glitchmasGetZonedParts(prevDay, timeZone);

  return glitchmasZonedTimeToUtcMs(
    { year: prev.year, month: prev.month, day: prev.day, hour: 22, minute: 0, second: 0 },
    timeZone
  );
}

function glitchmasGetScheduleState(now = new Date()) {
  const p = glitchmasGetZonedParts(now, GLITCHMAS_TZ);
  const mode = (p.hour >= 6 && p.hour < 22) ? 'day' : 'night';
  const rotationIds = GLITCHMAS_ROTATIONS[mode];

  const windowStartUtc = glitchmasComputeWindowStartUtcMs(now, GLITCHMAS_TZ);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - windowStartUtc) / 1000));

  const slotIndex = Math.floor(elapsedSeconds / GLITCHMAS_SLOT_SECONDS);
  const currentIdx = rotationIds.length ? (slotIndex % rotationIds.length) : 0;

  const currentProgram = PROGRAMS_BY_ID[rotationIds[currentIdx]];

  // Next 3 upcoming (wraps; with 3-item rotations this will include the current again as 3rd upcoming)
  const upcoming = [];
  for (let i = 1; i <= 3; i++) {
    const idx = rotationIds.length ? ((currentIdx + i) % rotationIds.length) : 0;
    const prog = PROGRAMS_BY_ID[rotationIds[idx]];
    if (prog) upcoming.push(prog);
  }

  return { mode, currentProgram, upcoming };
}

function glitchmasApplyScheduleUI(state) {
  // Update window header “Now Playing”
  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  if (nowPlayingTitle && state.currentProgram?.title) {
    nowPlayingTitle.textContent = state.currentProgram.title;
  }

  // Update next-3 posters
  const posters = document.querySelectorAll('#scheduleCarousel .poster');
  if (!posters.length) return;

  const labels = (typeof SCHEDULE_LABELS !== 'undefined' && Array.isArray(SCHEDULE_LABELS))
    ? SCHEDULE_LABELS
    : ['Up Next', 'After That', 'Then'];

  posters.forEach((poster, i) => {
    const program = state.upcoming[i];
    if (!program) return;

    const mainImg = poster.querySelector('img:not(.poster-still)');
    const stillImg = poster.querySelector('.poster-still');

    // Only overwrite images if you’ve provided real poster URLs
    if (mainImg && program.poster) mainImg.src = program.poster;
    if (stillImg && program.posterStill) stillImg.src = program.posterStill;

    // Ensure label exists (matches your existing behavior)
    let label = poster.querySelector('.poster-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'poster-label';
      poster.appendChild(label);
    }
    label.textContent = labels[i] || '';

    // Accessibility / metadata
    poster.setAttribute('data-title', program.title);
  });
}

(function glitchmasInitTimeBasedScheduleOverlay() {
  // Only run if schedule panel exists
  if (!document.getElementById('scheduleCarousel')) return;

  const tick = () => {
    try {
      const state = glitchmasGetScheduleState();
      glitchmasApplyScheduleUI(state);
    } catch (e) {
      // Fail silent to avoid breaking the broadcast
    }
  };

  tick();
  // Lightweight polling; avoids coupling to video events
  setInterval(tick, 15000);
})();


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

  /* ===========================
     Ghost Cursor Click Helper
  =========================== */

  // Function to move ghost cursor to an element and "click" it
  function ghostCursorClickElement(element, callback) {
    if (!ghostCursor) {
      callback();
      return;
    }

    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    // Move cursor to button
    ghostCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    ghostCursor.style.left = targetX + 'px';
    ghostCursor.style.top = targetY + 'px';

    // After cursor arrives, do a "click" animation and execute callback
    setTimeout(() => {
      // Quick press animation
      ghostCursor.style.transition = 'transform 0.1s ease';
      ghostCursor.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        ghostCursor.style.transform = 'scale(1)';
        
        // Execute the actual action
        setTimeout(() => {
          callback();
          
          // Reset cursor transition for normal movement
          setTimeout(() => {
            ghostCursor.style.transition = 'left 3s cubic-bezier(0.25, 0.1, 0.25, 1), top 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
          }, 100);
        }, 100);
      }, 100);
    }, 600);
  }

  /* ===========================
     Broadcast Clock
  =========================== */

  const clockElement = document.getElementById('broadcastClock');
  
  if (clockElement) {
    function updateClock() {
      const now = new Date();
      
      // Format time as 12-hour with AM/PM
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      // Get timezone abbreviation
      const timezoneName = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short'
      }).format(now).split(' ').pop();
      
      clockElement.textContent = `${hours}:${minutes} ${ampm} ${timezoneName}`;
    }
    
    // Update immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ===========================
     Signal Bar Fluctuation
  =========================== */

  const signalBars = document.querySelectorAll('.signal-bars .bar');
  
  if (signalBars.length > 0) {
    function fluctuateSignal() {
      // Randomly choose 2, 3, or 4 bars (with occasional 5)
      const rand = Math.random();
      let activeBars;
      
      if (rand < 0.05) {
        activeBars = 5; // 5% chance for full signal
      } else if (rand < 0.35) {
        activeBars = 2; // 30% chance for 2 bars
      } else if (rand < 0.70) {
        activeBars = 3; // 35% chance for 3 bars
      } else {
        activeBars = 4; // 30% chance for 4 bars
      }
      
      signalBars.forEach((bar, index) => {
        if (index < activeBars) {
          bar.style.opacity = '1';
        } else {
          bar.style.opacity = '0.2';
        }
      });
    }
    
    // Initial fluctuation
    fluctuateSignal();
    
    // Fluctuate rapidly - sketchy, unstable connection
    function scheduleNextFluctuation() {
      // Very short, erratic intervals (0.3s to 1.5s)
      const delay = 300 + Math.random() * 1200;
      setTimeout(() => {
        fluctuateSignal();
        scheduleNextFluctuation();
      }, delay);
    }
    
    scheduleNextFluctuation();
  }

  /* ===========================
     Chat Panel Minimize Easter Egg
  =========================== */

  const chatMinimizeBtn = document.getElementById('chatMinimizeBtn');
  const chatPanelWrap = document.getElementById('chatPanelWrap');
  const chatHeader = document.getElementById('chatHeader');
  let chatMinimized = false;

  if (chatMinimizeBtn && chatPanelWrap) {
    chatMinimizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const performAction = () => {
        if (chatMinimized) {
          // Restore
          chatPanelWrap.classList.remove('minimized');
          chatPanelWrap.classList.add('restoring');
          
          setTimeout(() => {
            chatPanelWrap.classList.remove('restoring');
          }, 400);
          
          chatMinimized = false;
        } else {
          // Minimize
          chatPanelWrap.classList.add('minimizing');
          
          setTimeout(() => {
            chatPanelWrap.classList.remove('minimizing');
            chatPanelWrap.classList.add('minimized');
          }, 400);
          
          chatMinimized = true;
        }
      };

      // Move ghost cursor to button and perform action
      ghostCursorClickElement(chatMinimizeBtn, performAction);
    });

    // Also allow clicking the header when minimized to restore
    chatHeader.addEventListener('click', (e) => {
      if (chatMinimized && e.target !== chatMinimizeBtn) {
        chatMinimizeBtn.click();
      }
    });
  }

  /* ===========================
     Signal Alert Modal
  =========================== */

  const signalBarsContainer = document.querySelector('.signal-bars');
  const signalModal = document.getElementById('signalModal');
  const signalModalOk = document.getElementById('signalModalOk');
  const signalModalClose = document.getElementById('signalModalClose');

  if (signalBarsContainer && signalModal && signalModalOk && signalModalClose) {
    // Show modal when signal bars are clicked
    signalBarsContainer.addEventListener('click', () => {
      signalModal.style.display = 'flex';
    });

    // Hide modal when OK button is clicked
    signalModalOk.addEventListener('click', () => {
      signalModal.style.display = 'none';
    });

    // Hide modal when red close button is clicked
    signalModalClose.addEventListener('click', () => {
      signalModal.style.display = 'none';
    });

    // Hide modal when clicking outside the panel
    signalModal.addEventListener('click', (e) => {
      if (e.target === signalModal) {
        signalModal.style.display = 'none';
      }
    });

    // Hide modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && signalModal.style.display === 'flex') {
        signalModal.style.display = 'none';
      }
    });
  }
});