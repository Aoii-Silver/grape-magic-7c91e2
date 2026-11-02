const root = document.querySelector('.experience');
const video = document.querySelector('video');
const artwork = document.querySelector('.artwork');
const begin = document.querySelector('.begin');
const player = document.querySelector('.player');
const togglePlay = document.querySelector('.toggle-play');
const mute = document.querySelector('.mute-control');
const progress = document.querySelector('.progress');
const timecode = document.querySelector('.timecode');

let controlsTimer;
let bufferTimer;
let seeking = false;
let hasStarted = false;

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const updateTime = () => {
  const duration = video.duration || 0;
  const value = duration ? (video.currentTime / duration) * 1000 : 0;
  if (!seeking) progress.value = value;
  progress.style.setProperty('--played', `${value / 10}%`);
  timecode.value = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  timecode.textContent = timecode.value;
};

const showControls = (keep = false) => {
  player.classList.add('controls-visible');
  clearTimeout(controlsTimer);
  if (!keep && !video.paused) {
    controlsTimer = setTimeout(() => player.classList.remove('controls-visible'), 2500);
  }
};

const setState = (state) => {
  root.dataset.state = state;
  player.classList.toggle('is-paused', state === 'paused');
  togglePlay.setAttribute('aria-label', state === 'paused' ? '播放' : '暫停');
};

const playVideo = async () => {
  root.classList.remove('has-error');
  hasStarted = true;
  video.muted = false;
  player.classList.remove('is-muted');
  setState('playing');
  setTimeout(async () => {
    try {
      await video.play();
      showControls();
    } catch (error) {
      root.classList.add('has-error');
      setState('cover');
    }
  }, 300);
};

const togglePlayback = async () => {
  if (video.paused) {
    try {
      await video.play();
      setState('playing');
      showControls();
    } catch (error) {
      root.classList.add('has-error');
    }
  } else {
    video.pause();
    setState('paused');
    player.classList.add('pause-flash');
    setTimeout(() => player.classList.remove('pause-flash'), 300);
    showControls(true);
  }
};

artwork.addEventListener('click', playVideo);
begin.addEventListener('click', () => {
  if (root.dataset.state === 'ended') video.currentTime = 0;
  playVideo();
});
togglePlay.addEventListener('click', (event) => { event.stopPropagation(); togglePlayback(); });

player.addEventListener('click', (event) => {
  if (event.target.closest('button, input')) return;
  if (player.classList.contains('controls-visible') && !video.paused) {
    player.classList.remove('controls-visible');
  } else {
    showControls(video.paused);
  }
});

mute.addEventListener('click', (event) => {
  event.stopPropagation();
  video.muted = !video.muted;
  player.classList.toggle('is-muted', video.muted);
  mute.setAttribute('aria-label', video.muted ? '開啟聲音' : '關閉聲音');
  showControls();
});

progress.addEventListener('input', () => {
  seeking = true;
  const next = (Number(progress.value) / 1000) * (video.duration || 0);
  progress.style.setProperty('--played', `${Number(progress.value) / 10}%`);
  timecode.textContent = `${formatTime(next)} / ${formatTime(video.duration)}`;
});
progress.addEventListener('change', () => {
  if (Number.isFinite(video.duration)) video.currentTime = (Number(progress.value) / 1000) * video.duration;
  seeking = false;
  showControls(video.paused);
});

video.addEventListener('loadedmetadata', () => {
  root.classList.remove('video-unavailable');
  updateTime();
});
video.addEventListener('timeupdate', updateTime);
video.addEventListener('play', () => { setState('playing'); player.classList.remove('is-paused'); });
video.addEventListener('pause', () => {
  if (hasStarted && !video.ended && root.dataset.state !== 'ended') {
    setState('paused');
    showControls(true);
  }
});
video.addEventListener('waiting', () => {
  clearTimeout(bufferTimer);
  bufferTimer = setTimeout(() => player.classList.add('is-buffering'), 400);
});
['playing', 'canplay'].forEach((eventName) => video.addEventListener(eventName, () => {
  clearTimeout(bufferTimer);
  player.classList.remove('is-buffering');
}));
video.addEventListener('error', () => {
  root.classList.add('video-unavailable');
  if (hasStarted) root.classList.add('has-error');
  setState('cover');
});
video.addEventListener('ended', () => {
  clearTimeout(controlsTimer);
  player.classList.remove('controls-visible');
  setTimeout(() => {
    setState('ended');
    begin.innerHTML = '<span>VIEW AGAIN</span><span aria-hidden="true">↗</span>';
  }, 400);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !video.paused) video.pause();
});

setTimeout(() => {
  if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) root.classList.add('video-unavailable');
}, 3500);
