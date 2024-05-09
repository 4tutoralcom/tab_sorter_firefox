function findTargetWindow(currnetWindowId) {
    console.debug('findTargetWindow');
    browser.windows.getAll({ populate: true }).then(function(windows) {
        
        windows.forEach(function(window) {
            console.log(currnetWindowId,window.id, window.tabs);
            // Check if this window contains a YouTube tab
            const hasYouTubeTab = window.tabs.some(tab => tab.url.includes("youtube.com/"));
            const isCurrnetWindow = currnetWindowId != window.id;
            if (hasYouTubeTab && isCurrnetWindow) {
                // This window contains a YouTube tab, use its ID as the target window ID
                moveYouTubeTabsToWindow(window.id);
                return; // Stop iterating through windows
            }
        });
    });
}

function moveYouTubeTabsToWindow(windowId) {

    browser.tabs.query({ url: "*:\/\/*.youtube.com/*" }).then(function(tabs) {
        tabs.forEach(function(tab) {
            browser.tabs.move(tab.id, { windowId: windowId, index: -1 });
        });
    });
}

browser.tabs.onCreated.addListener(function(tab) {
    console.log(tab);
    console.log(tab.title);
    console.log(tab.url);
    console.log(tab.id);
    if (tab.title.includes("youtube.com/")) {
        findTargetWindow(tab.windowId,tab.id);
    }
});
