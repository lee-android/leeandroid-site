document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('glitchmasVideo');
  const fireToggle = document.getElementById('fireToggle');
  const sliders = document.getElementById('sliders');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // iOS fullscreen handling (Option A)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS && fullscreenBtn) {
    fullscreenBtn.textContent = 'Tap video to fullscreen';
  }

  // Update slider value labels (data-val)
  function updateSliderLabel(slider) {
    const percent = Math.round(parseFloat(slider.value) * 100);
    const row = slider.closest('.slider');
    if (row) {
      row.setAttribute('data-val', percent + '%');
    }
  }

  // Initialize + live update
  ['rumbleVol','crackleVol','snowVol','tapeVol','musicVol','videoVol'].forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;

    updateSliderLabel(slider);
    slider.addEventListener('input', () => updateSliderLabel(slider));
  });

  // Hard enforce: hidden on load
  sliders.classList.add('hidden');
  sliders.setAttribute('aria-hidden', 'true');

  // Audio layers
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

  // Randomized start for ambient layers
  function randomizeStart(audio, tailSeconds = 5) {
    audio.addEventListener('loadedmetadata', () => {
      const d = audio.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const safeEnd = Math.max(0, d - tailSeconds);
      if (safeEnd <= 1) return;
      audio.currentTime = Math.random() * safeEnd;
    });
  }

  Object.values(audioMap).forEach(a => randomizeStart(a));

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
      }
    }, interval);

    fades.set(media, id);
  }

  function readSlider(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : 0;
  }

  function setVolumeWithKill(media, value) {
    if (value <= 0) {
      media.volume = 0;
      if (!media.paused) {
        try { media.pause(); } catch (e) {}
      }
    } else {
      if (media.paused) {
        try { media.play(); } catch (e) {}
      }
      media.volume = value;
    }
  }

  function setAllVolumesLive() {
    if (!fireplaceEnabled) return;

    setVolumeWithKill(audioMap.fire, readSlider('rumbleVol'));
    setVolumeWithKill(audioMap.crackle, readSlider('crackleVol'));
    setVolumeWithKill(audioMap.snowfall, readSlider('snowVol'));
    setVolumeWithKill(audioMap.tape, readSlider('tapeVol'));
    setVolumeWithKill(audioMap.music, readSlider('musicVol'));

    const v = readSlider('videoVol');
    if (v <= 0) {
      video.volume = 0;
      video.muted = true;
    } else {
      video.muted = false;
      video.volume = v;
    }
  }

  function enableFireplace() {
    fireplaceEnabled = true;
    sliders.classList.remove('hidden');
    sliders.setAttribute('aria-hidden', 'false');
    fireToggle.textContent = 'Disable Fireplace Sounds';

    Object.values(audioMap).forEach(a => a.play().catch(() => {}));

    fadeTo(audioMap.fire, readSlider('rumbleVol'));
    fadeTo(audioMap.crackle, readSlider('crackleVol'));
    fadeTo(audioMap.snowfall, readSlider('snowVol'));
    fadeTo(audioMap.tape, readSlider('tapeVol'));
    fadeTo(audioMap.music, readSlider('musicVol'));

    video.muted = false;
    fadeTo(video, readSlider('videoVol'));
  }

  function disableFireplace() {
    fireplaceEnabled = false;

    Object.values(audioMap).forEach(a => fadeTo(a, 0, 0.04, 40));
    fadeTo(video, 0, 0.04, 40);

    setTimeout(() => {
      Object.values(audioMap).forEach(a => {
        try { a.pause(); } catch (e) {}
      });
      video.muted = true;
      video.volume = 0;
    }, 260);

    sliders.classList.add('hidden');
    sliders.setAttribute('aria-hidden', 'true');
    fireToggle.textContent = 'Enable Fireplace Sounds';
  }

  fireToggle.addEventListener('click', () => {
    fireplaceEnabled ? disableFireplace() : enableFireplace();
  });

  ['rumbleVol','crackleVol','snowVol','tapeVol','musicVol','videoVol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setAllVolumesLive);
  });

  // iOS tap-to-fullscreen (real fullscreen, Apple-approved)
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    video.addEventListener('touchstart', () => {
      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }, { passive: true });
  }


  // Desktop fullscreen only (iOS handled by tapping video)
  fullscreenBtn.addEventListener('click', () => {
    if (isIOS) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.msRequestFullscreen) video.msRequestFullscreen();
  });

  video.addEventListener('contextmenu', e => e.preventDefault());

  // Simulated stream seek
  const hlsSource = 'https://vz-b741991d-4ed.b-cdn.net/dd768fbf-0260-4d51-9e01-98cd864edf1c/playlist.m3u8';
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
      try { video.currentTime = pos; } catch (e) {}
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
