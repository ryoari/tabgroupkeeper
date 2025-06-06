/**
 * background.js
 * This script is the core of the extension. It handles fetching tab data,
 * saving backups, scheduling periodic tasks, and managing user notifications and restores.
 */

// Define the backup limit. After this many backups, the user will be prompted.
const BACKUP_LIMIT = 24; // e.g., 24 hourly backups = 1 day's worth

// --- Core Functions ---

/**
 * Fetches all currently open tabs and their associated group data.
 * @returns {Promise<Array>} A promise that resolves to an array of objects,
 * each representing a tab and its group info.
 */
async function getCurrentSessionData() {
  const [tabs, tabGroups] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({})
  ]);

  const tabGroupMap = new Map(tabGroups.map(group => [group.id, group]));

  const sessionData = tabs.map(tab => {
    const group = tab.groupId !== chrome.tabs.TAB_ID_NONE ? tabGroupMap.get(tab.groupId) : null;
    return {
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      groupId: tab.groupId,
      groupName: group ? group.title : null,
      groupColor: group ? group.color : null,
    };
  });

  return sessionData;
}

/**
 * Saves the current tab and group session data to local storage with a timestamp.
 */
async function saveBackup() {
  try {
    const sessionData = await getCurrentSessionData();
    const timestamp = new Date().toISOString();
    await chrome.storage.local.set({ [timestamp]: sessionData });
    console.log(`Backup successful at: ${timestamp}`);
    await checkAndPromptForCleanup();
  } catch (error) {
    console.error("Failed to save backup:", error);
  }
}

/**
 * Checks if the number of backups exceeds the defined limit and prompts for cleanup.
 */
async function checkAndPromptForCleanup() {
  const allBackups = await chrome.storage.local.get(null);
  const backupKeys = Object.keys(allBackups);

  if (backupKeys.length > BACKUP_LIMIT) {
    chrome.notifications.create('cleanupPrompt', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Free Up Backup Space?',
      message: `You have over ${BACKUP_LIMIT} backups. Would you like to delete the oldest ones?`,
      buttons: [{ title: 'Yes, delete old backups' }, { title: 'No, keep all' }],
      priority: 2
    });
  }
}

/**
 * Deletes the oldest backups to reduce the total count to the defined limit.
 */
async function deleteOldBackups() {
  const allBackups = await chrome.storage.local.get(null);
  const sortedBackupKeys = Object.keys(allBackups).sort();

  const backupsToDeleteCount = sortedBackupKeys.length - BACKUP_LIMIT;
  if (backupsToDeleteCount <= 0) return;

  const keysToDelete = sortedBackupKeys.slice(0, backupsToDeleteCount);
  await chrome.storage.local.remove(keysToDelete);
  console.log('Successfully deleted old backups:', keysToDelete);
}

/**
 * NEW: Restores a session from a given backup timestamp.
 * @param {string} timestamp - The ISO string timestamp key of the backup to restore.
 * @param {boolean} inNewWindow - Whether to restore the session in a new window.
 */
async function restoreSession(timestamp, inNewWindow = true) {
  const backupData = await chrome.storage.local.get(timestamp);
  const sessionToRestore = backupData[timestamp];

  if (!sessionToRestore) {
    console.error("Could not find backup for timestamp:", timestamp);
    return;
  }

  // A map to track old group IDs from the backup to new group IDs created during restore.
  const oldToNewGroupIdMap = new Map();
  let windowId = null;

  if (inNewWindow) {
    const newWindow = await chrome.windows.create({ focused: true });
    windowId = newWindow.id;
    // Close the default tab that opens with a new window.
    if (newWindow.tabs.length > 0) {
       await chrome.tabs.remove(newWindow.tabs[0].id);
    }
  }

  for (const tabInfo of sessionToRestore) {
    if (!tabInfo.url || tabInfo.url.startsWith('chrome://')) {
        continue; // Don't restore internal pages.
    }
    
    // Create the new tab. We'll handle grouping after creation.
    const newTab = await chrome.tabs.create({ 
      url: tabInfo.url, 
      active: false,
      windowId: inNewWindow ? windowId : undefined
    });

    // Handle grouping logic
    const oldGroupId = tabInfo.groupId;
    if (oldGroupId && oldGroupId !== chrome.tabs.TAB_ID_NONE) {
      if (oldToNewGroupIdMap.has(oldGroupId)) {
        // Group already created, just add this tab to it.
        const newGroupId = oldToNewGroupIdMap.get(oldGroupId);
        await chrome.tabs.group({ tabIds: [newTab.id], groupId: newGroupId });
      } else {
        // First tab for this group, create a new group.
        const newGroupId = await chrome.tabs.group({ tabIds: [newTab.id] });
        oldToNewGroupIdMap.set(oldGroupId, newGroupId);
        // Update the new group with the saved color and title.
        await chrome.tabGroups.update(newGroupId, {
          title: tabInfo.groupName,
          color: tabInfo.groupColor,
        });
      }
    }
  }
  console.log("Session restored successfully for timestamp:", timestamp);
}


// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Group Keeper installed.');
  chrome.alarms.create('hourlyBackup', {
    delayInMinutes: 1,
    periodInMinutes: 60
  });
  saveBackup();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'hourlyBackup') {
    saveBackup();
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'cleanupPrompt') {
    if (buttonIndex === 0) {
      deleteOldBackups();
    }
    chrome.notifications.clear('cleanupPrompt');
  }
});
