interface Message {
  action: string;
  urls?: string[];
}

type tab = { windowId: number; tabs: number[] };

class TabsGroup {
  public windowTabList: tab[] = [];

  constructor() {}

  public addTabToList(windowId: number, tabId: number) {
    let existing_window = this.windowTabList.findIndex(
      (e) => e.windowId == windowId
    );
    if (existing_window >= 0) {
      tabId && this.windowTabList[existing_window].tabs.push(tabId);
    } else {
      windowId &&
        tabId &&
        this.windowTabList.push({ windowId: windowId, tabs: [tabId] });
    }
  }

  public isTabInList(windowId: number, tabId: number) {
    let existing_window = this.windowTabList.findIndex(
      (e) => e.windowId == windowId
    );
    if (existing_window >= 0) {
      return this.windowTabList[existing_window].tabs;
    }
    return false;
  }
}

let ALL_NEW_TABS: TabsGroup = new TabsGroup();
let MOVED_TABS: TabsGroup = new TabsGroup();

// Retrieve URLs from storage when extension starts
let URLS: string[] = [];
getURLsFromStorage((all_urls) => {
  URLS = all_urls;
});

function moveTabToWindow(
  windowId: number,
  tab: browser.tabs.Tab,
  index: number = -1
): void {
  console.log(MOVED_TABS.windowTabList);
  console.log("windowId", windowId);
  console.log("tab_ID", tab.id);
  console.log("tab", tab.windowId);
  if (!tab.id) {
    throw new Error("tab no id");
  }
  if (!tab.windowId) {
    throw new Error("tab no windowId");
  }
  //Check if the tab that is is in was already moved to
  if (!MOVED_TABS.isTabInList(tab.windowId, tab.id)) {
    MOVED_TABS.addTabToList(windowId, tab.id);
    console.log("Moving Tab");
    browser.tabs.move(tab.id, { windowId: windowId, index });
    browser.tabs.update(tab.id, { active: true });
  } else {
    console.log("Tab Already Moved");
  }
}

function findTargetWindow(
  currentWindowId: number,
  tab: browser.tabs.Tab,
  found_urls: string[],
  found_url: string
): void {
  browser.windows.getAll({ populate: true }).then((windows) => {
    windows.some((window) => {
      if (window.tabs) {
        let foundTabs = window.tabs.filter(
          (tab) => tab.url && tab.url.includes(found_url)
        );
        if (foundTabs.length == 0) {
          foundTabs = window.tabs.filter((tab) => {
            return found_urls.some((found_url) => {
              return tab.url && tab.url.includes(found_url);
            });
          });
        }

        console.log(`foundTabs `, foundTabs, "\n found urls", found_urls);
        /*console.log("currentWindowId", currentWindowId, "window.id", window.id);*/
        // Check if this window contains a YouTube tab
        const hasYouTubeTab = foundTabs.length > 0;
        const isCurrentWindow = currentWindowId == window.id;

        if (hasYouTubeTab && !isCurrentWindow) {
          if (window.id) {
            moveTabToWindow(
              window.id,
              tab,
              foundTabs[foundTabs.length - 1].index + 1
            );
            return true;
          }
          return false;
        }
      }
      return false;
    });
  });
}

browser.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: browser.tabs._OnUpdatedChangeInfo,
    tab: browser.tabs.Tab
  ) => {
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
  if (tab.title == "New Tab" && tab.url == "about:newtab") {
    //console.log(all_new_tabs);
  }
  check(tab);
});

function check(tab: browser.tabs.Tab) {
  URLS.some((url_group) => {
    let found_urls = url_group.split(",");
    return found_urls.some((url) => {
      console.log("trying to find ", url);
      if (
        (tab.url && tab.url.includes(url)) ||
        (tab.title && tab.title.includes(url))
      ) {
        if (tab.windowId && tab.id) {
          findTargetWindow(tab.windowId, tab, found_urls, url);
          return true;
        }
      }
      return false;
    });
  });
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
  browser.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      if (message.action === "saveURLs") {
        URLS = message.urls || [];
        URLS = URLS.filter(url=>url !== "")
        saveURLsToStorage(URLS);
      }
    }
  );
}
