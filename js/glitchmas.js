document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('glitchmasVideo');
  const fireToggle = document.getElementById('fireToggle');
  const sliders = document.getElementById('sliders');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Force hidden on load
  sliders.classList.add('hidden');
  sliders.setAttribute('aria-hidden', 'true');

  // Update slider value labels (data-val)
  function updateSliderLabel(slider) {
    const percent = Math.round(parseFloat(slider.value) * 100);
    const row = slider.closest('.slider');
    if (row) row.setAttribute('data-val', percent + '%');
  }

  const sliderIds = ['rumbleVol','crackleVol','snowVol','tapeVol','musicVol','videoVol'];
  sliderIds.forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;
    updateSliderLabel(slider);
    slider.addEventListener('input', () => updateSliderLabel(slider));
  });

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
    a.muted = true;
  });

  // Random start (stream vibe). Works best after metadata is available.
  function randomizeStartOnce(audio, tailSeconds = 5) {
    const attempt = () => {
      const d = audio.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const safeEnd = Math.max(0, d - tailSeconds);
      if (safeEnd <= 1) return;
      audio.currentTime = Math.random() * safeEnd;
    };

    // Try now, then once when metadata arrives
    attempt();
    audio.addEventListener('loadedmetadata', attempt, { once: true });
  }

  let fireplaceEnabled = false;

  function readSlider(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : 0;
  }

  // True zero behavior (mute + pause)
  function setVolumeWithKill(media, value) {
    if (value <= 0) {
      media.volume = 0;
      media.muted = true;
      try { media.pause(); } catch (e) {}
      return;
    }

    media.muted = false;
    media.volume = value;

    if (media.paused) {
      try { media.play(); } catch (e) {}
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

    // Start audio via user gesture, randomize their start points
    Object.values(audioMap).forEach(a => {
      randomizeStartOnce(a);
      a.muted = false;
      a.play().catch(() => {});
    });

    // Apply volumes immediately (and allow true zero pausing)
    setAllVolumesLive();
  }

  function disableFireplace() {
    fireplaceEnabled = false;

    Object.values(audioMap).forEach(a => {
      a.volume = 0;
      a.muted = true;
      try { a.pause(); } catch (e) {}
    });

    video.volume = 0;
    video.muted = true;

    sliders.classList.add('hidden');
    sliders.setAttribute('aria-hidden', 'true');
    fireToggle.textContent = 'Enable Fireplace Sounds';
  }

  fireToggle.addEventListener('click', () => {
    fireplaceEnabled ? disableFireplace() : enableFireplace();
  });

  sliderIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setAllVolumesLive);
  });

  // Desktop fullscreen button (hidden on mobile via CSS)
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      // Request fullscreen on the video itself
      if (video.requestFullscreen) video.requestFullscreen();
      else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
      else if (video.msRequestFullscreen) video.msRequestFullscreen();
    });
  }

  // Block hotkeys that control playback (desktop)
  window.addEventListener('keydown', (e) => {
    const blocked = [' ', 'ArrowRight', 'ArrowLeft', 'k', 'j'];
    if (blocked.includes(e.key)) e.preventDefault();
  });

  // Prevent right click save menu
  video.addEventListener('contextmenu', (e) => e.preventDefault());

  // Simulated stream seek
  const hlsSource = 'https://vz-b741991d-4ed.b-cdn.net/dd768fbf-0260-4d51-9e01-98cd864edf1c/playlist.m3u8';
  const duration = 5556; // seconds
  const streamStart = new Date('2024-12-24T18:00:00-06:00').getTime();
  const now = Date.now();

  let offset = Math.floor((now - streamStart) / 1000);
  if (offset < 0) offset = 0;
  const position = offset % duration;

  function startAt(pos) {
    // Autoplay requires muted
    video.muted = true;
    video.volume = 0;

    const trySeek = () => {
      try { video.currentTime = pos; } catch (e) {}
      video.play().catch(() => {});
    };

    video.addEventListener('loadedmetadata', trySeek, { once: true });
  }

  // Native HLS (Safari)
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsSource;
    startAt(position);
  } else if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(hlsSource);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => startAt(position));
  } else {
    console.error('HLS not supported in this browser.');
  }
});
