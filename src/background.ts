function moveTabToWindow(windowId: number, tabID: number, index: number = -1): void {
  browser.tabs.move(tabID, { windowId: windowId, index });
  browser.tabs.update(tabID, { active: true });
}

let all_new_tabs: {windowId:number, new_tabs:number[]}[] = [];

function findTargetWindow(currnetWindowId: number, tabID: number, found_url: string): void {
  browser.windows.getAll({ populate: true }).then((windows) => {
    windows.some((window) => {
      if (window.tabs) {
        const foundTabs = window.tabs.filter((tab) => tab.url && tab.url.includes(found_url));

        // Check if this window contains a YouTube tab
        const hasYouTubeTab = foundTabs.length > 0;
        const isCurrentWindow = currnetWindowId == window.id;

        if (hasYouTubeTab && !isCurrentWindow) {
          if (window.id) {
            moveTabToWindow(window.id, tabID, foundTabs[foundTabs.length - 1].index + 1);
            return true;
          }
          return false;
        }
      }
      return false;
    });
  });
}

// Retrieve URLs from storage when extension starts
let urls: string[] = [];
getURLsFromStorage((all_urls) => {
  urls = all_urls;
});

browser.tabs.onUpdated.addListener(
  (tabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo, tab: browser.tabs.Tab) => {
    //console.log('onUpdated',tab);
    //let existing_window=all_new_tabs.findIndex((e)=>e.windowId==tab.windowId)
    let passCheck = true;

    if (passCheck && changeInfo.status === "complete") {
      check(tab);
    }
  }
);

browser.tabs.onCreated.addListener((tab) => {
    //console.log('onCreated',tab);
    if (tab.title=="New Tab" && tab.​url=="about:newtab"){
        let existing_window=all_new_tabs.findIndex((e)=>e.windowId==tab.windowId)
        if( existing_window >= 0 ){
            tab.id && all_new_tabs[existing_window].new_tabs.push(tab.id)
        }else {
            tab.​windowId && tab.id && all_new_tabs.push({windowId:tab.​windowId,new_tabs:[tab.​id]})
        }
        //console.log(all_new_tabs);
    }
  check(tab);
});

function check(tab: browser.tabs.Tab) {
  urls.some((url) => {
    if ((tab.url && tab.url.includes(url)) || (tab.title && tab.title.includes(url))) {
      if (tab.windowId && tab.id) {
        findTargetWindow(tab.windowId, tab.id, url);
        return true;
      }
    }
    return false;
  });
}

interface Message {
  action: string;
  urls?: string[];
}

// Function to save URLs to storage
function saveURLsToStorage(urls: string[]): void {
  if (typeof browser !== "undefined" && browser.storage) {
    browser.storage.sync
      .set({ urls: urls })
      .then(() => {
        console.log("URLs saved to storage:", urls);
      })
      .catch((error) => {
        console.error("Error saving URLs:", error);
      });
  }
}

// Function to retrieve URLs from storage
function getURLsFromStorage(callback: (urls: string[]) => void): void {
  if (typeof browser !== "undefined" && browser.storage) {
    browser.storage.sync
      .get("urls")
      .then((result) => {
        const urls: string[] = result.urls || [];
        console.log("URLs retrieved from storage:", urls);
        callback(urls);
      })
      .catch((error) => {
        console.error("Error retrieving URLs:", error);
      });
  }
}

// Handler for messages from popup
if (typeof browser !== "undefined" && browser.runtime) {
  browser.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    if (message.action === "saveURLs") {
      urls = message.urls || [];
      saveURLsToStorage(urls);
    }
  });
}
