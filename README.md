Project Structure and Setup

To get this working, organize the files into the following folder structure.

/TabGroupKeeper/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background.js
├── manifest.json
├── popup.css
├── popup.html
└── popup.js

You will need to create the icons folder and place three icon files inside it. You can create simple placeholder images for now.
How to Load the Extension in Microsoft Edge

1. Save the Files: Save all the code blocks above into their corresponding files within the structure shown.

2. Open Edge Extensions: Open Microsoft Edge and navigate to the extensions page by typing edge://extensions/ in the address bar and pressing Enter.
    
3. Enable Developer Mode: On the bottom-left corner of the extensions page, find the "Developer mode" toggle and turn it on.
    
4. Load Unpacked: Several new buttons will appear. Click on the "Load unpacked" button.
    
5. Select Folder: A file dialog will open. Navigate to and select the main TabGroupKeeper folder that you created.
    
Done! The "Tab Group Keeper" extension will now appear in your list of installed extensions and its icon will be added to the Edge toolbar. 
It will start its first backup immediately and continue to run every hour.


A Note on Local File Storage:

For security reasons, web extensions are sandboxed and cannot directly write to arbitrary physical files on your computer. 
The standard and most secure way to achieve persistent storage is by using the chrome.storage.local API. 
This API stores data within the browser's user profile directory, which persists even when the browser is closed. 
My solution uses this method as it's the industry-standard and recommended approach.
