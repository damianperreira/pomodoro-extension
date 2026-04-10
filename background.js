const ALARM_NAME = 'pomodoro-session';

// Enable side panel on extension startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle action click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// --- Timer alarm management ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'startTimer') {
    const endTime = Date.now() + msg.remainingSeconds * 1000;
    chrome.storage.local.set({
      timerEndTime: endTime,
      timerTotalSeconds: msg.totalSeconds,
      timerIsWorkSession: msg.isWorkSession,
      timerWorkTime: msg.workTime,
      timerBreakTime: msg.breakTime,
      timerRunning: true
    }, () => {
      chrome.alarms.create(ALARM_NAME, { when: endTime });
      sendResponse({ ok: true });
    });
    return true; // async response

  } else if (msg.action === 'pauseTimer') {
    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.storage.local.set({
        timerRemainingSeconds: msg.remainingSeconds,
        timerRunning: false,
        timerEndTime: null
      }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;

  } else if (msg.action === 'resetTimer') {
    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.storage.local.set({
        timerRunning: false,
        timerEndTime: null,
        timerRemainingSeconds: null
      }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;

  } else if (msg.action === 'getTimerState') {
    chrome.storage.local.get([
      'timerEndTime', 'timerTotalSeconds', 'timerIsWorkSession',
      'timerWorkTime', 'timerBreakTime', 'timerRunning', 'timerRemainingSeconds'
    ], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

// --- Alarm fired: session complete ---

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  chrome.storage.local.get(['timerIsWorkSession', 'timerWorkTime', 'timerBreakTime'], (result) => {
    const wasWork = result.timerIsWorkSession;
    const workTime = result.timerWorkTime || 25;
    const breakTime = result.timerBreakTime || 5;

    // Fire notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Pomodoro Timer',
      message: wasWork
        ? 'Work session complete! Time for a break.'
        : 'Break time over! Ready to work?'
    });

    // Update stats if work session completed
    if (wasWork) {
      chrome.storage.sync.get(['completedPomodoros', 'totalFocusTime', 'lastStatsDate'], (stats) => {
        const today = new Date().toDateString();
        let pomodoros = stats.completedPomodoros || 0;
        let focusTime = stats.totalFocusTime || 0;
        if (stats.lastStatsDate !== today) {
          pomodoros = 0;
          focusTime = 0;
        }
        pomodoros++;
        focusTime += workTime;
        chrome.storage.sync.set({
          completedPomodoros: pomodoros,
          totalFocusTime: focusTime,
          lastStatsDate: today
        });
      });
    }

    // Clear timer state — session is over, don't auto-start next
    chrome.storage.local.set({
      timerRunning: false,
      timerEndTime: null,
      timerRemainingSeconds: null,
      timerSessionComplete: true,
      timerCompletedWasWork: wasWork,
      timerWorkTime: workTime,
      timerBreakTime: breakTime
    });
  });
});

// Handle notification clicks — open side panel
chrome.notifications.onClicked.addListener((_notificationId) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.sidePanel.open({ windowId: tabs[0].windowId });
    }
  });
});
