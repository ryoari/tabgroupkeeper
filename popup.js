document.addEventListener('DOMContentLoaded', () => {
    const backupButton = document.getElementById('backupButton');
    const statusMessage = document.getElementById('statusMessage');
    const backupsList = document.getElementById('backupsList');
    const newWindowCheckbox = document.getElementById('newWindowCheckbox');

    let backgroundPage = null;

    // Get a reference to the background page for calling its functions
    chrome.runtime.getBackgroundPage(page => {
        backgroundPage = page;
    });

    /**
     * Handles the click event for the manual backup button.
     */
    backupButton.addEventListener('click', () => {
        if (backgroundPage && typeof backgroundPage.saveBackup === 'function') {
            backgroundPage.saveBackup();
            statusMessage.textContent = 'Backup created successfully!';
            statusMessage.classList.remove('opacity-0');
            // Refresh the list to show the new backup
            loadBackups();
            setTimeout(() => { statusMessage.classList.add('opacity-0'); }, 3000);
        }
    });

    /**
     * Formats an ISO date string into a more readable format.
     * @param {string} isoString - The date string to format.
     * @returns {string} A formatted date string (e.g., "Jun 06, 11:34 PM").
     */
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
        }) + ', ' + date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Fetches all backups from storage and populates the UI list.
     */
    async function loadBackups() {
        // Clear the current list
        backupsList.innerHTML = '';
        
        const allBackups = await chrome.storage.local.get(null);
        // Get all timestamps and sort them in descending order (newest first)
        const sortedKeys = Object.keys(allBackups).sort().reverse();

        if (sortedKeys.length === 0) {
            backupsList.innerHTML = '<div class="p-4 text-center text-sm text-gray-500">No backups found.</div>';
            return;
        }
        
        // Create a list item for each backup
        sortedKeys.forEach(timestamp => {
            const item = document.createElement('div');
            item.className = 'backup-item';
            item.textContent = formatTimestamp(timestamp);
            item.dataset.timestamp = timestamp; // Store the raw timestamp in a data attribute

            // Add a click listener to trigger the restore
            item.addEventListener('click', () => {
                if (backgroundPage && typeof backgroundPage.restoreSession === 'function') {
                    const restoreInNewWindow = newWindowCheckbox.checked;
                    backgroundPage.restoreSession(timestamp, restoreInNewWindow);
                    // Close the popup after initiating the restore
                    window.close();
                }
            });
            backupsList.appendChild(item);
        });
    }

    // Initial load of the backup list when the popup is opened.
    loadBackups();
});
