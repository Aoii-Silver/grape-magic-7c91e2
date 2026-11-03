const root = document.querySelector('.experience');
const cover = document.querySelector('.cover-page');
const player = document.querySelector('.player');
const video = document.querySelector('video');
const artwork = document.querySelector('.artwork');
const begin = document.querySelector('.begin');
const beginLabel = document.querySelector('.begin-label');
const toggle = document.querySelector('.toggle-play');
const mute = document.querySelector('.mute-control');
const progress = document.querySelector('.progress');
const timecode = document.querySelector('.timecode');
const statusMessage = document.querySelector('.status-message');
let controlsTimer, bufferTimer, endTimer;
let active = false;
let seeking = false;
let initiating = false;
let launchVersion = 0;
let returnFocus = begin;
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
function clearBuffer() { clearTimeout(bufferTimer); player.classList.remove('is-buffering'); }
function returnToCover(ended = false) {
  active = false; initiating = false; launchVersion++;
  clearTimeout(controlsTimer); clearTimeout(endTimer); clearBuffer();
  video.pause();
  root.dataset.state = ended ? 'ended' : 'cover';
  cover.inert = false; cover.removeAttribute('aria-hidden');
  player.inert = true; player.setAttribute('aria-hidden', 'true');
  beginLabel.textContent = ended ? 'もう一度' : 'touch to begin';
  beginLabel.lang = ended ? 'ja' : 'en';
  begin.setAttribute('aria-label', ended ? '再次觀看製作影片' : '開啟製作影片');
  if (ended) artwork.setAttribute('aria-label', '再次觀看製作影片');
  returnFocus.focus({preventScroll: true});
}
function showError() {
  returnToCover(false);
  root.classList.add('has-error');
  statusMessage.textContent = '影片暫時無法播放，請點一下重試。';
  beginLabel.textContent = 'try again';
}
function startFilm(event) {
  if (initiating) return;
  returnFocus = event.currentTarget;
  clearTimeout(endTimer);
  root.classList.remove('has-error'); statusMessage.textContent = '';
  if (video.error) video.load();
  if (video.ended || root.dataset.state === 'ended') video.currentTime = 0;
  active = true; initiating = true;
  const attempt = ++launchVersion;
  player.inert = false; player.removeAttribute('aria-hidden');
  cover.inert = true; cover.setAttribute('aria-hidden', 'true');
  root.dataset.state = 'playing';
  // Keep play() directly inside the touch/click event for iPhone Safari.
  const started = video.play();
  returnFocus.blur();
  showControls();
  if (event.detail === 0) toggle.focus({preventScroll: true});
  started.then(() => { if (attempt === launchVersion) { initiating = false; showControls(); } }).catch(error => {
    if (attempt !== launchVersion || !active) return;
    initiating = false;
    if (error.name !== 'AbortError') showError();
    else setPaused(true);
  });
}
function toggleFilm() {
  if (video.paused) {
    const attempt = launchVersion;
    video.play().catch(error => {
      if (active && attempt === launchVersion && error.name !== 'AbortError') showError();
    });
  } else video.pause();
}
artwork.addEventListener('click', startFilm);
begin.addEventListener('click', startFilm);
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
video.addEventListener('pause', () => { if (!video.ended) setPaused(true); });
video.addEventListener('waiting', () => { clearTimeout(bufferTimer); bufferTimer = setTimeout(() => { if (active) player.classList.add('is-buffering'); }, 450); });
['playing', 'canplay', 'seeked'].forEach(name => video.addEventListener(name, clearBuffer));
video.addEventListener('error', () => { if (active) showError(); });
video.addEventListener('ended', () => { clearBuffer(); clearTimeout(controlsTimer); endTimer = setTimeout(() => returnToCover(true), 450); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active) video.pause(); });
window.addEventListener('pagehide', () => video.pause());
