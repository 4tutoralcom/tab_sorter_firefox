function moveTabToWindow(windowId: number, tabID: number, index: number = -1): void {
  browser.tabs.move(tabID, { windowId: windowId, index });
  browser.tabs.update(tabID, { active: true });
}
type tab = { windowId: number; tabs: number[] };
type tabsWindowList= tab[];


let ALL_NEW_TABS: tabsWindowList = [];
let MOVED_TABS: tabsWindowList = [];

function addTabToList( ​windowId:number,tabId:number, windowTabList:tabsWindowList){

    let existing_window=windowTabList.findIndex((e)=>e.windowId==windowId)
    if( existing_window >= 0 ){
        tabId && windowTabList[existing_window].tabs.push(tabId)
    }else {
        ​windowId && tabId && windowTabList.push({windowId:​windowId,tabs:[tabId]})
    }
}
function isTabInList(​windowId:number,tabId:number, windowTabList:tabsWindowList){
    let existing_window=windowTabList.findIndex((e)=>e.windowId==windowId);
    if( existing_window >= 0 ){
        return windowTabList[existing_window].tabs
    }
    return false


}
function findTargetWindow(currnetWindowId: number, tabID: number, found_url: string): void {
  browser.windows.getAll({ populate: true }).then((windows) => {
    windows.some((window) => {
      if (window.tabs) {
        const foundTabs = window.tabs.filter((tab) => tab.url && tab.url.includes(found_url));

        console.log(`foundTabs `, foundTabs, "\n found url", found_url);
        console.log("currnetWindowId", currnetWindowId, "window.id", window.id);
        // Check if this window contains a YouTube tab
        const hasYouTubeTab = foundTabs.length > 0;
        const isCurrentWindow = currnetWindowId == window.id;

        if (hasYouTubeTab && !isCurrentWindow) {
          if (window.id) {
            //console.log("Moving Tab");
            
            addTabToList(window.id, tabID,MOVED_TABS);
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
