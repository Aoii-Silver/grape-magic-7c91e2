const root = document.querySelector('.experience');
const cover = document.querySelector('.cover-page');
const player = document.querySelector('.player');
const video = document.querySelector('video');
const artwork = document.querySelector('.artwork');
const toggle = document.querySelector('.toggle-play');
const mute = document.querySelector('.mute-control');
const progress = document.querySelector('.progress');
const timecode = document.querySelector('.timecode');
const statusMessage = document.querySelector('.status-message');
const streamUrl = 'assets/film-hls1.m3u8';
const fallbackUrl = 'assets/film-lite1.mp4';
const stallLimit = 12000;
let controlsTimer, bufferTimer, stallTimer, endTimer;
let source = '', hls;
let active = false;
let seeking = false;
let initiating = false;
let wantsPlayback = false;
let launchVersion = 0;
let returnFocus = artwork;
const time = value => {
  const n = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2,'0')}`;
};
function syncTime() {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const position = seeking ? Number(progress.value) / 1000 * duration : video.currentTime;
  if (!seeking) progress.value = duration ? position / duration * 1000 : 0;
  progress.style.setProperty('--played', `${Number(progress.value) / 10}%`);
  progress.setAttribute('aria-valuetext', `${time(position)} / ${time(duration)}`);
  timecode.textContent = `${time(position)} / ${time(duration)}`;
  progress.disabled = !duration;
}
function showControls() {
  player.classList.add('controls-visible');
  clearTimeout(controlsTimer);
  if (active && !video.paused && !seeking) controlsTimer = setTimeout(() => player.classList.remove('controls-visible'), 2800);
}
function setPaused(paused) {
  if (!active) return;
  root.dataset.state = paused ? 'paused' : 'playing';
  player.classList.toggle('is-paused', paused);
  toggle.setAttribute('aria-label', paused ? '繼續播放影片' : '暫停影片');
  showControls();
}
function clearBuffer() {
  clearTimeout(bufferTimer); bufferTimer = undefined;
  clearTimeout(stallTimer); stallTimer = undefined;
  player.classList.remove('is-buffering');
}
function watchBuffer() {
  if (!active || video.paused || stallTimer) return;
  bufferTimer = setTimeout(() => player.classList.add('is-buffering'), 450);
  stallTimer = setTimeout(() => recoverPlayback(true), stallLimit);
}
function useFallback(position = 0) {
  source = 'mp4';
  hls?.destroy();
  hls = undefined;
  video.src = fallbackUrl;
  if (position > 0) video.currentTime = position;
}
function prepareSource() {
  const native = video.canPlayType('application/vnd.apple.mpegurl');
  const library = window.Hls;
  const useLibrary = library?.isSupported();
  if (native && (navigator.vendor === 'Apple Computer, Inc.' || !useLibrary)) {
    source = 'hls';
    video.src = streamUrl;
  } else if (useLibrary) {
    source = 'hls';
    hls = new library({startLevel: 0});
    hls.on(library.Events.ERROR, (_, error) => {
      if (!error.fatal) return;
      if (active) recoverPlayback(wantsPlayback);
      else useFallback(video.currentTime);
    });
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
  } else {
    useFallback();
  }
}
function recoverPlayback(resume) {
  if (source !== 'hls') {
    showError();
    return;
  }
  clearBuffer();
  launchVersion++;
  initiating = false;
  useFallback(video.currentTime);
  if (resume) requestPlayback();
  else setPaused(true);
}
function requestPlayback() {
  const attempt = ++launchVersion;
  initiating = true;
  wantsPlayback = true;
  const started = video.play();
  watchBuffer();
  started.then(() => {
    if (attempt !== launchVersion) return;
    initiating = false;
    showControls();
  }).catch(error => {
    if (attempt !== launchVersion || !active) return;
    initiating = false;
    clearBuffer();
    if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
      wantsPlayback = false;
      setPaused(true);
    } else recoverPlayback(true);
  });
}
function pausePlayback() {
  wantsPlayback = false;
  video.pause();
}
function returnToCover(ended = false) {
  active = false; initiating = false; launchVersion++;
  clearTimeout(controlsTimer); clearTimeout(endTimer); clearBuffer();
  player.classList.remove('is-starting');
  pausePlayback();
  root.dataset.state = ended ? 'ended' : 'cover';
  cover.inert = false; cover.removeAttribute('aria-hidden');
  player.inert = true; player.setAttribute('aria-hidden', 'true');
  artwork.setAttribute('aria-label', ended ? '再次觀看製作影片' : '播放卡牌製作影片');
  returnFocus.focus({preventScroll: true});
}
function showError() {
  returnToCover(false);
  root.classList.add('has-error');
  statusMessage.textContent = '影片暫時無法播放，請點卡牌重試。';
  artwork.setAttribute('aria-label', '重試播放製作影片');
}
function startFilm(event) {
  if (initiating) return;
  returnFocus = event.currentTarget;
  clearTimeout(endTimer);
  root.classList.remove('has-error'); statusMessage.textContent = '';
  if (video.error) useFallback();
  if (video.ended || root.dataset.state === 'ended') video.currentTime = 0;
  active = true;
  player.inert = false; player.removeAttribute('aria-hidden');
  cover.inert = true; cover.setAttribute('aria-hidden', 'true');
  root.dataset.state = 'playing';
  player.classList.toggle('is-starting', video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA);
  if (!source) prepareSource();
  // Keep play() directly inside the touch/click event for iPhone Safari.
  requestPlayback();
  returnFocus.blur();
  showControls();
  if (event.detail === 0) toggle.focus({preventScroll: true});
}
function toggleFilm() {
  if (video.paused) requestPlayback();
  else pausePlayback();
}
artwork.addEventListener('click', startFilm);
toggle.addEventListener('click', toggleFilm);
document.querySelector('.close-player').addEventListener('click', () => returnToCover(false));
mute.addEventListener('click', () => { video.muted = !video.muted; showControls(); });
video.addEventListener('volumechange', () => {
  player.classList.toggle('is-muted', video.muted);
  mute.setAttribute('aria-label', video.muted ? '開啟聲音' : '關閉聲音');
  mute.setAttribute('aria-pressed', String(video.muted));
});
player.addEventListener('click', event => {
  if (event.target.closest('button, input')) return;
  if (player.classList.contains('controls-visible') && !video.paused) {
    player.classList.remove('controls-visible');
    if (player.contains(document.activeElement)) document.activeElement.blur();
  } else showControls();
});
player.addEventListener('keydown', event => {
  if (event.key === 'Escape') returnToCover(false);
  if (event.key === 'Tab') showControls();
});
progress.addEventListener('pointerdown', () => { seeking = true; clearTimeout(controlsTimer); });
progress.addEventListener('input', () => {
  seeking = true;
  if (Number.isFinite(video.duration)) video.currentTime = Number(progress.value) / 1000 * video.duration;
  syncTime();
});
function finishSeek() { seeking = false; syncTime(); showControls(); }
progress.addEventListener('change', finishSeek);
progress.addEventListener('pointerup', finishSeek);
progress.addEventListener('pointercancel', finishSeek);
progress.addEventListener('blur', finishSeek);
video.addEventListener('loadedmetadata', syncTime);
video.addEventListener('durationchange', syncTime);
video.addEventListener('timeupdate', syncTime);
video.addEventListener('play', () => setPaused(false));
video.addEventListener('pause', () => {
  if (!video.paused) return;
  clearBuffer();
  if (!video.ended) setPaused(true);
});
video.addEventListener('waiting', watchBuffer);
video.addEventListener('playing', () => {
  clearBuffer();
  player.classList.remove('is-starting');
});
video.addEventListener('error', () => {
  if (active && video.error) recoverPlayback(wantsPlayback);
});
video.addEventListener('ended', () => { clearBuffer(); clearTimeout(controlsTimer); endTimer = setTimeout(() => returnToCover(true), 450); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active) pausePlayback(); });
window.addEventListener('pagehide', pausePlayback);
