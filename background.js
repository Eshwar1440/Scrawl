chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.contextMenus.create({
    id: 'send-to-notepad',
    title: 'Send selection to Scrawl',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'send-page-url',
    title: 'Send page URL to Scrawl',
    contexts: ['page'],
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'send-to-notepad' && info.menuItemId !== 'send-page-url') {
    return;
  }

  const payload = {
    type: 'capture',
    text: info.selectionText || '',
    url: tab.url,
    title: tab.title,
    timestamp: Date.now(),
    windowId: tab.windowId,
  };

  await chrome.sidePanel.open({ windowId: tab.windowId });
  // wait for panel to load
  setTimeout(() => chrome.runtime.sendMessage(payload).catch(() => {}), 300);
});

// save content on window close
chrome.windows.onRemoved.addListener(async (windowId) => {
  const sessionKey = `notepad:${windowId}`;
  const result = await chrome.storage.session.get(sessionKey);
  const content = result[sessionKey];
  await chrome.storage.session.remove(sessionKey);

  if (!content) return;

  await chrome.storage.session.set({
    [`grace:${windowId}`]: { content, savedAt: Date.now() },
  });

  chrome.alarms.create(`grace-cleanup:${windowId}`, { delayInMinutes: 5 });
});

// delete grace entry on expiry
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('grace-cleanup:')) return;
  const windowId = alarm.name.slice('grace-cleanup:'.length);
  await chrome.storage.session.remove(`grace:${windowId}`);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== chrome.runtime.id) return false;

  if (message.type === 'cancel-grace') {
    chrome.alarms.clear(`grace-cleanup:${message.windowId}`);
    chrome.storage.session.remove(`grace:${message.windowId}`);
  }

  return false;
});
