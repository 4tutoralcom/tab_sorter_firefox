interface Message {
  action: string;
  urls?: string[];
}

type tab = { windowId: number; tabs: number[] };

class TabsGroup {
  public windowTabList: tab[] = [];

  constructor() {}

  public addTabToList(windowId: number, tabId: number) {
    let existing_window = this.windowTabList.findIndex((e) => e.windowId == windowId);
    if (existing_window >= 0) {
      tabId && this.windowTabList[existing_window].tabs.push(tabId);
    } else {
      windowId && tabId && this.windowTabList.push({ windowId: windowId, tabs: [tabId] });
    }
  }

  public isTabInList(windowId: number, tabId: number) {
    let existing_window = this.windowTabList.findIndex((e) => e.windowId == windowId);
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

function moveTabToWindow(windowId: number, tab: browser.tabs.Tab, index: number = -1): void {
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

function tabsUrlInList(tab: browser.tabs.Tab): string | undefined {
  let allUrls: string[] = URLS.map((url) => {
    return url.split(",");
  }, URLS).flat(1);
  console.log(allUrls, tab.url);

  return allUrls.find((url) => {
    return tab.url?.includes(url) || tab.title?.includes(url);
  });
}

function findWindowFor(tab: browser.tabs.Tab, foundUrl: string): Promise<number | undefined> {
  console.log("find tab not in", tab.windowId);
  return browser.tabs.query({}).then((tabs) => {
    tabs = tabs.filter((currentTab) => currentTab.windowId && currentTab.windowId != tab.windowId);
    let foundWindow: number | undefined;
    if (
      tabs.some((tab) => {
        console.log({ windowId: tab.windowId, idnex: tab.index, pinned: tab.pinned });
        if (tab.url?.includes(foundUrl) || tab.title?.includes(foundUrl)) {
          foundWindow = tab.windowId;
          return tab.pinned;
        }
        return false;
      })
    ) {
      return foundWindow;
    } else {
      return foundWindow;
    }
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

let browserListeners = {
  tabs: {
    onUpdated: (tabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo, tab: browser.tabs.Tab) => {
      if (changeInfo.status == "complete") {
        const foundUrl = tabsUrlInList(tab);
        if (foundUrl) {
          console.log(foundUrl);
          findWindowFor(tab, foundUrl).then((foundWindowID) => {
            if (foundWindowID) {
              browser.tabs.query({ windowId: foundWindowID }).then((tabs) => {
                console.log(tabs);
                let lastTabIndex = 0;
                for (let index = tabs.length - 1; index >= 0; index--) {
                  const foundTab = tabs[index];
                  if (foundTab.url?.includes(foundUrl) || foundTab.title?.includes(foundUrl)) {
                    foundTab.windowId && moveTabToWindow(foundTab.windowId,tab,foundTab.index+1)
                    break;
                  }
                }
                console.log(lastTabIndex);
              });
            }
          });
        }
      }
    },
    onCreated: (tab: browser.tabs.Tab) => {
      if (tab.title != "New Tab" && tab.url != "about:newtab") {
        if (tab.status && tab.status == "complete") {
          console.log("tab onCreated", tab);
        }
      }

      //check(tab);
    },
  },
  runtime: {
    onMessage: (message: Message, _sender: any, _sendResponse: any) => {
      if (message.action === "saveURLs") {
        URLS = message.urls || [];
        URLS = URLS.filter((url) => url !== "");
        saveURLsToStorage(URLS);
      }
    },
  },
};

if (typeof browser !== "undefined") {
  if (browser.runtime) {
    browser.runtime.onMessage.addListener(browserListeners.runtime.onMessage);
  }
  browser.tabs.onUpdated.addListener(browserListeners.tabs.onUpdated);
  browser.tabs.onCreated.addListener(browserListeners.tabs.onCreated);
}
