const phase = document.querySelector('#phase');
const progress = document.querySelector('#progress');
const detail = document.querySelector('#detail');
const logs = document.querySelector('#logs');
window.updateProgress.onState(state => {
  document.body.dataset.state = state.phase;
  phase.textContent = state.title;
  detail.textContent = state.detail;
  logs.textContent = state.logs || '';
  if (typeof state.percent === 'number') { progress.max = 100; progress.value = state.percent; }
  else progress.removeAttribute('value');
  document.querySelector('#cancel').hidden = !['download', 'verify'].includes(state.phase);
  document.querySelector('#close').hidden = !['success', 'error', 'cancelled'].includes(state.phase);
  document.querySelector('#restart').hidden = state.phase !== 'success';
});
for (const action of ['cancel', 'close', 'restart']) document.querySelector('#' + action).addEventListener('click', () => window.updateProgress.action(action));
window.updateProgress.ready();
