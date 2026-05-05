// Inline SVG used when a station's favicon URL is missing or fails to load.
// Music-note glyph on a transparent background; sized via CSS to fit the 28x28 icon slot.
// Only `#` is percent-encoded; modern browsers accept the rest of the SVG verbatim in a data URI.
const FALLBACK_STATION_ICON =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'>" +
  "<path d='M12 3v10.55a4 4 0 1 0 2 3.45V7h4V3z'/>" +
  "</svg>";

class PomodoroTimer {
  static FALLBACK_ICON = FALLBACK_STATION_ICON;

  constructor() {
    // Timer state
    this.workTime = 25;
    this.breakTime = 5;
    this.timeLeft = this.workTime * 60;
    this.totalTime = this.workTime * 60;
    this.isRunning = false;
    this.isWorkSession = true;
    this.timer = null;

    // Stats
    this.completedPomodoros = 0;
    this.totalFocusTime = 0;

    // Tasks
    this.tasks = [];
    this.activeTaskId = null;

    // Music
    this.audio = null;
    this.isPlaying = false;
    this.currentSource = null; // { type: 'sound'|'radio', name: string }
    this.radioStations = [];

    // Ring
    this.ringCircumference = 2 * Math.PI * 97; // r=97

    // DOM elements
    this.timerDisplay = document.getElementById('timerDisplay');
    this.sessionType = document.getElementById('sessionType');
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.ringProgress = document.getElementById('ringProgress');
    this.workTimeInput = document.getElementById('workTime');
    this.breakTimeInput = document.getElementById('breakTime');
    this.taskInput = document.getElementById('taskInput');
    this.addTaskBtn = document.getElementById('addTaskBtn');
    this.taskList = document.getElementById('taskList');
    this.taskBanner = document.getElementById('taskBanner');
    this.taskBannerName = document.getElementById('taskBannerName');
    this.modeWork = document.getElementById('modeWork');
    this.modeBreak = document.getElementById('modeBreak');
    this.musicToggle = document.getElementById('musicToggle');
    this.musicSelect = document.getElementById('musicSelect');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.volumeLabel = document.getElementById('volumeLabel');
    this.nowPlaying = document.getElementById('nowPlaying');
    this.nowPlayingName = document.getElementById('nowPlayingName');
    this.radioList = document.getElementById('radioList');

    this.bindEvents();
    this.loadStats();
    this.loadTasks();
    this.updateDisplay();
    this.updateRing();
    this.updateBanner();
    this.syncWithBackground();
  }

  // Wraps chrome.runtime.sendMessage so a dropped service-worker connection
  // never surfaces as an unhandled promise rejection. The callback still fires
  // with `undefined` if the send failed; callers must handle that case.
  _send(msg, cb) {
    if (!chrome?.runtime?.sendMessage) {
      if (cb) cb(undefined);
      return;
    }
    try {
      const ret = chrome.runtime.sendMessage(msg, (resp) => {
        void chrome.runtime.lastError; // mark as read
        if (cb) cb(resp);
      });
      if (ret && typeof ret.catch === 'function') ret.catch(() => {});
    } catch (_) {
      if (cb) cb(undefined);
    }
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startTimer());
    this.pauseBtn.addEventListener('click', () => this.pauseTimer());
    this.resetBtn.addEventListener('click', () => this.resetTimer());
    this.modeWork.addEventListener('click', () => this.switchMode(true));
    this.modeBreak.addEventListener('click', () => this.switchMode(false));
    this.addTaskBtn.addEventListener('click', () => this.addTask());
    this.taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTask();
    });
    this.musicToggle.addEventListener('click', () => this.toggleMusic());
    document.getElementById('stopAll').addEventListener('click', () => this.stopAll());
    this.volumeSlider.addEventListener('input', () => {
      const vol = this.volumeSlider.value;
      this.volumeLabel.textContent = vol + '%';
      if (this.audio) this.audio.volume = vol / 100;
    });

    // Music tabs
    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tabSounds').classList.toggle('hidden', tab.dataset.tab !== 'sounds');
        document.getElementById('tabRadio').classList.toggle('hidden', tab.dataset.tab !== 'radio');
      });
    });

    // Radio category buttons
    document.querySelectorAll('.radio-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.radio-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadRadioStations(btn.dataset.tag);
      });
    });
    this.workTimeInput.addEventListener('change', () => {
      let val = parseInt(this.workTimeInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 60) val = 60;
      this.workTimeInput.value = val;
      this.workTime = val;
      if (this.isWorkSession && !this.isRunning) {
        this.timeLeft = this.workTime * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateRing();
      }
    });
    this.breakTimeInput.addEventListener('change', () => {
      let val = parseInt(this.breakTimeInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 30) val = 30;
      this.breakTimeInput.value = val;
      this.breakTime = val;
      if (!this.isWorkSession && !this.isRunning) {
        this.timeLeft = this.breakTime * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateRing();
      }
    });
  }

  switchMode(toWork) {
    if (this.isRunning) return; // don't switch while timer is active
    if (this.isWorkSession === toWork) return;
    this.isWorkSession = toWork;
    this.timeLeft = toWork ? this.workTime * 60 : this.breakTime * 60;
    this.totalTime = this.timeLeft;
    this.updateDisplay();
    this.updateRing();
    this.updateModeToggle();
    this._send({ action: 'resetTimer' });
  }

  updateModeToggle() {
    this.modeWork.classList.toggle('active', this.isWorkSession);
    this.modeBreak.classList.toggle('active', !this.isWorkSession);
    this.sessionType.textContent = this.isWorkSession ? 'focus' : 'break';
  }

  syncWithBackground() {
    this._send({ action: 'getTimerState' }, (state) => {
      if (!state) return;

      // Handle a session that completed while sidebar was closed
      if (state.timerSessionComplete) {
        const wasWork = state.timerCompletedWasWork;
        this.workTime = state.timerWorkTime || 25;
        this.breakTime = state.timerBreakTime || 5;
        this.isWorkSession = !wasWork; // already flipped
        this.timeLeft = this.isWorkSession ? this.workTime * 60 : this.breakTime * 60;
        this.totalTime = this.timeLeft;
        this.isRunning = false;
        this.workTimeInput.value = this.workTime;
        this.breakTimeInput.value = this.breakTime;
        this.updateDisplay();
        this.updateRing();
        this.updateModeToggle();
        this.startBtn.disabled = false;
        // Reload stats since background updated them
        this.loadStats();
        // Clear the flag
        chrome.storage.local.set({ timerSessionComplete: false });
        return;
      }

      if (state.timerRunning && state.timerEndTime) {
        // Timer is actively running — sync to it
        const remaining = Math.max(0, Math.round((state.timerEndTime - Date.now()) / 1000));
        this.totalTime = state.timerTotalSeconds || this.totalTime;
        this.isWorkSession = state.timerIsWorkSession;
        this.workTime = state.timerWorkTime || this.workTime;
        this.breakTime = state.timerBreakTime || this.breakTime;
        this.workTimeInput.value = this.workTime;
        this.breakTimeInput.value = this.breakTime;

        if (remaining <= 0) {
          // Alarm should have fired — treat as complete
          this.completeSession();
          return;
        }

        this.timeLeft = remaining;
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.updateDisplay();
        this.updateRing();
        this.updateModeToggle();
        this._startDisplayInterval();

      } else if (!state.timerRunning && state.timerRemainingSeconds != null) {
        // Timer is paused — show remaining time
        this.timeLeft = state.timerRemainingSeconds;
        this.totalTime = state.timerTotalSeconds || this.totalTime;
        this.isWorkSession = state.timerIsWorkSession;
        this.workTime = state.timerWorkTime || this.workTime;
        this.breakTime = state.timerBreakTime || this.breakTime;
        this.workTimeInput.value = this.workTime;
        this.breakTimeInput.value = this.breakTime;
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.updateDisplay();
        this.updateRing();
        this.updateModeToggle();
      }
    });
  }

  startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startBtn.disabled = true;

    this._send({
      action: 'startTimer',
      remainingSeconds: this.timeLeft,
      totalSeconds: this.totalTime,
      isWorkSession: this.isWorkSession,
      workTime: this.workTime,
      breakTime: this.breakTime
    });

    this._startDisplayInterval();
  }

  _startDisplayInterval() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (chrome?.runtime?.sendMessage) {
        // Sync from the authoritative end time
        this._send({ action: 'getTimerState' }, (state) => {
          if (!state || !state.timerEndTime) return;
          this.timeLeft = Math.max(0, Math.round((state.timerEndTime - Date.now()) / 1000));
        });
      } else {
        this.timeLeft--;
      }

      this.updateDisplay();
      this.updateRing();

      if (this.timeLeft <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  pauseTimer() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timer);
    this.startBtn.disabled = false;

    this._send({
      action: 'pauseTimer',
      remainingSeconds: this.timeLeft
    });
  }

  resetTimer() {
    this.isRunning = false;
    clearInterval(this.timer);
    this.timeLeft = this.isWorkSession ? this.workTime * 60 : this.breakTime * 60;
    this.totalTime = this.timeLeft;
    this.updateDisplay();
    this.updateRing();
    this.startBtn.disabled = false;

    this._send({ action: 'resetTimer' });
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.timerDisplay.textContent =
      String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  updateRing() {
    const progress = this.totalTime > 0 ? this.timeLeft / this.totalTime : 1;
    const offset = this.ringCircumference * (1 - progress);
    this.ringProgress.style.strokeDashoffset = offset;
  }

  updateBanner() {
    const active = this.tasks.find(t => t.id === this.activeTaskId && !t.completed);
    if (active) {
      this.taskBannerName.textContent = active.text;
      this.taskBanner.classList.remove('empty');
    } else {
      this.taskBannerName.textContent = 'No task selected';
      this.taskBanner.classList.add('empty');
      this.activeTaskId = null;
    }
  }

  setActiveTask(id) {
    this.activeTaskId = this.activeTaskId === id ? null : id;
    this.updateBanner();
    this.renderTasks();
    this.saveActiveTask();
  }

  completeSession() {
    this.isRunning = false;
    clearInterval(this.timer);

    // Update local stats for immediate UI feedback
    if (this.isWorkSession) {
      this.completedPomodoros++;
      this.totalFocusTime += this.workTime;
      this.updateStats();
      // Don't saveStats here — background.js handles persistence on alarm fire
    }

    // Play notification sound in sidebar (background handles the notification itself)
    try {
      const notifSound = new Audio('sounds/notification.wav');
      notifSound.play();
    } catch (_) { /* audio may not be available */ }

    // Switch session
    this.isWorkSession = !this.isWorkSession;
    this.timeLeft = this.isWorkSession ? this.workTime * 60 : this.breakTime * 60;
    this.totalTime = this.timeLeft;
    this.updateDisplay();
    this.updateRing();
    this.startBtn.textContent = 'Start';
    this.startBtn.disabled = false;
    this.updateModeToggle();

    // Clear background timer state
    this._send({ action: 'resetTimer' });
  }

  // --- Stats ---

  updateStats() {
    document.getElementById('completedPomodoros').textContent = this.completedPomodoros;
    const hours = Math.floor(this.totalFocusTime / 60);
    const mins = this.totalFocusTime % 60;
    document.getElementById('focusTime').textContent =
      hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const completed = this.tasks.filter(t => t.completed).length;
    const total = this.tasks.length;
    document.getElementById('taskStats').textContent = `${completed} of ${total} completed`;
  }

  saveStats() {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.set({
      completedPomodoros: this.completedPomodoros,
      totalFocusTime: this.totalFocusTime,
      lastStatsDate: new Date().toDateString()
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save stats:', chrome.runtime.lastError.message);
      }
    });
  }

  loadStats() {
    if (!chrome?.storage?.sync) {
      this.updateStats();
      return;
    }
    chrome.storage.sync.get(['completedPomodoros', 'totalFocusTime', 'lastStatsDate'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to load stats:', chrome.runtime.lastError.message);
        return;
      }
      const today = new Date().toDateString();
      if (result.lastStatsDate !== today) {
        this.completedPomodoros = 0;
        this.totalFocusTime = 0;
        this.saveStats();
      } else {
        this.completedPomodoros = result.completedPomodoros || 0;
        this.totalFocusTime = result.totalFocusTime || 0;
      }
      this.updateStats();
  
    });
  }

  // --- Tasks ---

  addTask() {
    const text = this.taskInput.value.trim();
    if (!text) return;
    const task = { id: Date.now(), text, completed: false };
    this.tasks.push(task);
    this.taskInput.value = '';
    // Auto-select first task if none active
    if (!this.activeTaskId) {
      this.activeTaskId = task.id;
      this.updateBanner();
    }
    this.saveTasks();
    this.renderTasks();
    this.updateStats();
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      if (task.completed && this.activeTaskId === id) {
        // Move to next incomplete task
        const next = this.tasks.find(t => !t.completed && t.id !== id);
        this.activeTaskId = next ? next.id : null;
      }
      this.updateBanner();
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (this.activeTaskId === id) {
      const next = this.tasks.find(t => !t.completed);
      this.activeTaskId = next ? next.id : null;
      this.updateBanner();
    }
    this.saveTasks();
    this.renderTasks();
    this.updateStats();
  }

  renderTasks() {
    this.taskList.innerHTML = '';
    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.completed) li.classList.add('completed');
      if (task.id === this.activeTaskId) li.classList.add('active');

      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;
      span.addEventListener('click', () => {
        if (!task.completed) this.setActiveTask(task.id);
      });

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const completeBtn = document.createElement('button');
      completeBtn.className = 'btn-complete';
      completeBtn.textContent = task.completed ? 'Undo' : 'Done';
      completeBtn.addEventListener('click', () => this.toggleTask(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Del';
      deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

      actions.appendChild(completeBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(span);
      li.appendChild(actions);
      this.taskList.appendChild(li);
    });
  }

  saveTasks() {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.set({ tasks: this.tasks, activeTaskId: this.activeTaskId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save tasks:', chrome.runtime.lastError.message);
      }
    });
  }

  saveActiveTask() {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.set({ activeTaskId: this.activeTaskId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save active task:', chrome.runtime.lastError.message);
      }
    });
  }

  loadTasks() {
    if (!chrome?.storage?.sync) {
      this.renderTasks();
      this.updateStats();
      return;
    }
    chrome.storage.sync.get(['tasks', 'activeTaskId'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to load tasks:', chrome.runtime.lastError.message);
        return;
      }
      this.tasks = result.tasks || [];
      this.activeTaskId = result.activeTaskId || null;
      this.updateBanner();
      this.renderTasks();
      this.updateStats();
    });
  }

  // --- Music (Sounds tab) ---

  toggleMusic() {
    if (this.isPlaying && this.currentSource?.type === 'sound') {
      this.stopAll();
    } else {
      this.playSoundTrack();
    }
  }

  playSoundTrack() {
    const selected = this.musicSelect.value;
    if (!selected) {
      this.musicSelect.focus();
      return;
    }

    const sources = {
      'focus': [
        'https://ice1.somafm.com/dronezone-128-mp3',
        'https://ice2.somafm.com/groovesalad-128-mp3'
      ],
      'nature': [
        'https://purenature-mynoise.radioca.st/stream',
        'https://nature-rex.radioca.st/stream'
      ],
      'white-noise': [
        'https://ice1.somafm.com/deepspaceone-128-mp3',
        'https://ice2.somafm.com/deepspaceone-128-mp3',
        'https://ice1.somafm.com/spacestation-128-mp3'
      ],
      'rain': [
        'https://maggie.torontocast.com:2020/stream/natureradiorain',
        'https://rainyday-mynoise.radioca.st/stream'
      ]
    };

    const labels = {
      'focus': 'Focus Sounds',
      'nature': 'Nature Sounds',
      'white-noise': 'White Noise',
      'rain': 'Rain Sounds'
    };

    this.stopAll();
    this._playSoundFromList(sources[selected], 0, labels[selected]);
  }

  _playSoundFromList(urls, index, label) {
    if (index >= urls.length) {
      console.error('All sound streams failed for:', label);
      return;
    }

    this.audio = new Audio(urls[index]);
    this.audio.volume = this.volumeSlider.value / 100;
    this.audio.onerror = () => {
      console.warn('Stream failed, trying fallback:', urls[index]);
      this.audio = null;
      this._playSoundFromList(urls, index + 1, label);
    };
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.currentSource = { type: 'sound', name: label };
      this.musicToggle.textContent = 'Stop';
      this.showNowPlaying(label);
    }).catch(() => {
      this.audio = null;
      this._playSoundFromList(urls, index + 1, label);
    });
  }

  // --- Music (Radio tab) ---

  async loadRadioStations(tag) {
    this.radioList.innerHTML = '<div class="radio-loading">Loading stations...</div>';

    // all.api is round-robin DNS and can return a slow/dead mirror; de1 is a stable fallback.
    const hosts = ['all.api.radio-browser.info', 'de1.api.radio-browser.info'];
    const path = `/json/stations/search?tag=${encodeURIComponent(tag)}&limit=20&order=votes&reverse=true&hidebroken=true&has_extended_info=false`;

    let stations = null;
    let lastErr = null;
    for (const host of hosts) {
      try {
        const resp = await fetch(`https://${host}${path}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        stations = await resp.json();
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!stations) {
      console.error('Failed to load radio stations:', lastErr);
      this.radioList.innerHTML = '<div class="radio-loading">Failed to load stations</div>';
      return;
    }

    this.radioStations = stations.filter(s => s.url_resolved);
    if (this.radioStations.length === 0) {
      this.radioList.innerHTML = '<div class="radio-loading">No stations found</div>';
      return;
    }
    this.renderRadioStations();
  }

  renderRadioStations() {
    if (this.radioStations.length === 0) {
      if (!this.radioList.innerHTML) {
        this.radioList.innerHTML = '<div class="radio-loading">Select a genre to load stations</div>';
      }
      return;
    }
    this.radioList.innerHTML = '';
    this.radioStations.forEach(station => {
      const div = document.createElement('div');
      div.className = 'radio-station';
      if (this.isPlaying && this.currentSource?.type === 'radio' && this.currentSource.url === station.url_resolved) {
        div.classList.add('playing');
      }

      const icon = document.createElement('div');
      icon.className = 'radio-station-icon';
      const img = document.createElement('img');
      img.src = station.favicon || PomodoroTimer.FALLBACK_ICON;
      img.alt = '';
      img.onerror = function () {
        // Avoid an infinite error loop if the fallback itself were to fail
        this.onerror = null;
        this.src = PomodoroTimer.FALLBACK_ICON;
      };
      icon.appendChild(img);

      const info = document.createElement('div');
      info.className = 'radio-station-info';

      const name = document.createElement('div');
      name.className = 'radio-station-name';
      name.textContent = station.name;

      const tags = document.createElement('div');
      tags.className = 'radio-station-tags';
      tags.textContent = [station.country, station.tags?.split(',').slice(0, 3).join(', ')].filter(Boolean).join(' · ');

      info.appendChild(name);
      info.appendChild(tags);

      const playBtn = document.createElement('button');
      playBtn.className = 'radio-play-btn';
      playBtn.textContent = (div.classList.contains('playing')) ? '■' : '▶';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (div.classList.contains('playing')) {
          this.stopAll();
        } else {
          this.playRadioStation(station);
        }
      });

      div.appendChild(icon);
      div.appendChild(info);
      div.appendChild(playBtn);
      div.addEventListener('click', () => {
        if (div.classList.contains('playing')) {
          this.stopAll();
        } else {
          this.playRadioStation(station);
        }
      });

      this.radioList.appendChild(div);
    });
  }

  playRadioStation(station) {
    this.stopAll();

    this.audio = new Audio(station.url_resolved);
    this.audio.volume = this.volumeSlider.value / 100;

    this.audio.onerror = () => {
      console.error('Radio stream failed:', station.name);
      this.stopAll();
    };

    this.audio.play().then(() => {
      this.isPlaying = true;
      this.currentSource = { type: 'radio', name: station.name, url: station.url_resolved };
      this.showNowPlaying(station.name);
      this.renderRadioStations();
    }).catch((err) => {
      console.error('Failed to play radio:', err);
    });
  }

  // --- Shared playback controls ---

  showNowPlaying(name) {
    this.nowPlayingName.textContent = name;
    this.nowPlaying.classList.remove('hidden');
  }

  stopAll() {
    if (this.audio) {
      // Remove error listener before clearing src to avoid re-entrant calls
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.isPlaying = false;
    this.currentSource = null;
    this.musicToggle.textContent = 'Play';
    this.nowPlaying.classList.add('hidden');
    this.renderRadioStations();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PomodoroTimer();
});
