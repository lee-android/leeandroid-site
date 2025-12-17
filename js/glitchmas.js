document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('glitchmasVideo');
  const fireToggle = document.getElementById('fireToggle');
  const sliders = document.getElementById('sliders');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (!video || !fireToggle || !sliders) return;

  // ---------------------------
  // Platform detection
  // ---------------------------
  const isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ---------------------------
  // Perceptual volume curve
  // ---------------------------
  function perceptualVolume(value) {
    return value <= 0 ? 0 : Math.pow(value, 2);
  }

  // ---------------------------
  // data-val slider labels
  // ---------------------------
  function updateSliderLabel(slider) {
    const percent = Math.round(parseFloat(slider.value) * 100);
    const row = slider.closest('.slider');
    if (row) row.setAttribute('data-val', percent + '%');
  }

  const sliderIds = [
    'rumbleVol',
    'crackleVol',
    'snowVol',
    'tapeVol',
    'musicVol',
    'videoVol'
  ];

  sliderIds.forEach(id => {
    const s = document.getElementById(id);
    if (!s) return;
    updateSliderLabel(s);
    s.addEventListener('input', () => updateSliderLabel(s));
  });

  // ---------------------------
  // Slider visibility (animated)
  // ---------------------------
  sliders.classList.add('hidden', 'is-hidden');
  sliders.setAttribute('aria-hidden', 'true');

  // ---------------------------
  // Audio layers
  // ---------------------------
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

  // Randomized start points (stream vibe)
  function randomizeStart(audio, tailSeconds = 5) {
    const handler = () => {
      const d = audio.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const safeEnd = Math.max(0, d - tailSeconds);
      if (safeEnd <= 1) return;
      try { audio.currentTime = Math.random() * safeEnd; } catch {}
    };

    audio.addEventListener('loadedmetadata', handler);
    audio.addEventListener('canplay', handler, { once: true });
  }

  Object.values(audioMap).forEach(randomizeStart);

  let fireplaceEnabled = false;
  const fades = new Map();

  function stopFade(media) {
    const id = fades.get(media);
    if (id) {
      clearInterval(id);
      fades.delete(media);
    }
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

  function readSlider(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : 0;
  }

  // Kill-at-zero + perceptual scaling
  function setVolumeWithKill(media, value) {
    const v = Math.max(0, Math.min(1, value));
    const pv = perceptualVolume(v);

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

    setVolumeWithKill(audioMap.fire, readSlider('rumbleVol'));
    setVolumeWithKill(audioMap.crackle, readSlider('crackleVol'));
    setVolumeWithKill(audioMap.snowfall, readSlider('snowVol'));
    setVolumeWithKill(audioMap.tape, readSlider('tapeVol'));
    setVolumeWithKill(audioMap.music, readSlider('musicVol'));

    const v = readSlider('videoVol');
    const pv = perceptualVolume(v);

    if (pv <= 0) {
      video.volume = 0;
      video.muted = true;
    } else {
      video.muted = false;
      video.volume = pv;
    }
  }

  function enableFireplace() {
    fireplaceEnabled = true;

    sliders.classList.remove('hidden');
    requestAnimationFrame(() => {
      sliders.classList.remove('is-hidden');
    });
    sliders.setAttribute('aria-hidden', 'false');
    fireToggle.textContent = 'Disable Fireplace Sounds';

    Object.values(audioMap).forEach(a => a.play().catch(() => {}));

    fadeTo(audioMap.fire, perceptualVolume(readSlider('rumbleVol')));
    fadeTo(audioMap.crackle, perceptualVolume(readSlider('crackleVol')));
    fadeTo(audioMap.snowfall, perceptualVolume(readSlider('snowVol')));
    fadeTo(audioMap.tape, perceptualVolume(readSlider('tapeVol')));
    fadeTo(audioMap.music, perceptualVolume(readSlider('musicVol')));

    video.muted = false;
    fadeTo(video, perceptualVolume(readSlider('videoVol')));
  }

  function disableFireplace() {
    fireplaceEnabled = false;

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

    setTimeout(() => {
      sliders.classList.add('hidden');
    }, 220);
  }

  fireToggle.addEventListener('click', () => {
    fireplaceEnabled ? disableFireplace() : enableFireplace();
  });

  sliderIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setAllVolumesLive);
  });

  // ---------------------------
  // Fullscreen behavior
  // ---------------------------
  if (isIOS) {
    video.addEventListener('touchstart', () => {
      if (video.webkitEnterFullscreen) {
        try { video.webkitEnterFullscreen(); } catch {}
      }
    }, { passive: true });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (isIOS) return;
      if (video.requestFullscreen) video.requestFullscreen();
      else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
      else if (video.msRequestFullscreen) video.msRequestFullscreen();
    });
  }

  video.addEventListener('contextmenu', e => e.preventDefault());

  // ---------------------------
  // Simulated stream seek
  // ---------------------------
  const hlsSource =
    'https://vz-b741991d-4ed.b-cdn.net/dd768fbf-0260-4d51-9e01-98cd864edf1c/playlist.m3u8';
  const duration = 5556;
  const streamStart = new Date('2024-12-24T18:00:00-06:00').getTime();

  const now = Date.now();
  let offset = Math.floor((now - streamStart) / 1000);
  if (offset < 0) offset = 0;
  const position = offset % duration;

  function startAt(pos) {
    video.muted = true;
    video.volume = 0;

    video.addEventListener('loadedmetadata', () => {
      try { video.currentTime = pos; } catch {}
      video.play().catch(() => {});
    }, { once: true });
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsSource;
    startAt(position);
  } else if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(hlsSource);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => startAt(position));
  }
});
