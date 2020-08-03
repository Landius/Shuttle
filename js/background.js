const storage = browser.storage.sync;
const defaultData = {
  active: { type: "proxy", name: "proxy" },
  proxies: {
    direct: {type: 'direct'},
    proxy: {
      type: "socks",
      host: "127.0.0.1",
      port: 8480,
      proxyDNS: true
    },
  },
  profiles: {
    profile:{
      defaultProxy: "direct",
      rules: [
        {proxyName: 'proxy', hosts: []}
      ],
    },
},
};
// init data
let data = null;
let icon = {
  NORMAL: { path: "img/icon.svg" },
  ACTIVE: { path: "img/icon_filled.svg" },
  state: 'NORMAL'
}
// store the detail of active tab
let activeTab = {id: -1, url: '', currentProxy: 'direct', currentActive: null};
// store the detail of newest created tab
let createdTab = {id: -1, url: ''};

storage.get(null, (result) => {
  if(browser.runtime.lastError || Object.keys(result).length == 0){
    console.error(browser.runtime.lastError || 'storage is empty');
    data = defaultData;
    storage.set(data);
  }else{
    data = result;
  }

  // handle requests
  browser.proxy.onRequest.addListener(handleRequest, {urls: ["<all_urls>"]});
  browser.proxy.onError.addListener(error=>{ console.error(error); });

  // handle msg
  browser.runtime.onMessage.addListener(handleMsg);

  // init icon
  setIcon();

  // change addon icon if current page is using proxy
  browser.tabs.onCreated.addListener(tab=>{
    createdTab.id = tab.id;
    // A newly created tab's url is always about:blank, but the tab's title is the target url.
    try {
      // test if tab.title is an incomplete url
      new URL(tab.title);
      createdTab.url = tab.title;
    } catch (error) {
      createdTab.url = 'https://' + tab.title;
    } finally {
      setIcon();
    }
  });
  browser.tabs.onActivated.addListener(setIcon);
  browser.windows.onFocusChanged.addListener(setIcon);
});


function handleMsg(msg, sender, sendResponse){
  switch (msg.cmd) {
    case 'getData':
      sendResponse(data);
      break;
    case 'getActiveTab':
      sendResponse(activeTab);
      break;
    case 'setData':
      data = msg.data;
      storage.set(data).then(sendResponse);
      break;
    case 'setActive':
      data.active = msg.active;
      storage.set(data);
      setIcon();
      break;
    case 'editRule':
      editRule(msg.rule);
      storage.set(data);
      setIcon();
      sendResponse();
      break;
    default:
      console.error('Unsupported msg:', msg);
      break;
  }
}

function handleRequest(requestInfo){
  let url, proxyInfoPromise;
  if(requestInfo.documentUrl){
    url = requestInfo.documentUrl;
  }else if(requestInfo.tabId == -1){
    url = requestInfo.url;
  }else if(requestInfo.tabId == createdTab.id){
    url = createdTab.url;
  }else{
    proxyInfoPromise = browser.tabs.get(requestInfo.tabId).then(tab=>{
      if(tab.url){
        return getProxyByUrl(tab.url).proxyInfo;
      }else{
        reject(tab);
      }
    }).catch(error=>{
      console.error('Error in onRequest():', error);
      console.error('requestInfo:', requestInfo);
      return data.active.type == 'proxy' ? data.proxies[data.active.name] : data.proxies[data.profiles[data.active.name].proxyName];
    });
  }
  return proxyInfoPromise || getProxyByUrl(url).proxyInfo;
}

function setIcon(){
  const winId = browser.windows.WINDOW_ID_CURRENT;
  browser.tabs.query({active: true, windowId: winId}).then(result=>{
    if(result.length != 1){
      console.error('result of tabs.query:', result);
    }else{
      activeTab.id = result[0].id;
      if(result[0].id == createdTab.id && result[0].url == 'about:blank'){
        activeTab.url = createdTab.url;
      }else{
        activeTab.url = result[0].url;
      }
      activeTab.currentProxy = getProxyByUrl(activeTab.url).proxyName;
      activeTab.currentActive = data.active;
      let state = (activeTab.currentProxy == 'direct' ? 'NORMAL' : 'ACTIVE');
      if(state != icon.state){
        // only change icon if needed
        browser.browserAction.setIcon(icon[state]);
        icon.state = state;
      }
    }
  }).catch(error=>{ console.error(error); });
}

function editRule(rule){
  const profile = data.profiles[data.active.name];
  let isExist = false;
  for(const profileRule of profile.rules){
    const hostIndex = profileRule.hosts.indexOf(rule.host);
    if(profileRule.proxyName == rule.proxyName){
      if(hostIndex == -1){
        profileRule.hosts.push(rule.host);
      }
      isExist = true;
    }else if(hostIndex != -1){
      // delete host if proxyName not match
      profileRule.hosts.splice(hostIndex, 1);
    }
  }
  if(isExist == false){
    const newRule = {proxyName: rule.proxyName, hosts:[rule.host]};
    profile.rules.push(newRule);
  }
}

function getProxyByUrl(url){
  const supportedProtocol = ["http:", "https:", "ws:", "wss:", "ftp:", "ftps:"];
  const urlObject = new URL(url);
  let proxyName = 'direct';
  if(supportedProtocol.includes(urlObject.protocol)){
    if(data.active.type == 'proxy'){
      proxyName = data.active.name;
    }else{
      const profile = data.profiles[data.active.name];
      proxyName = profile.defaultProxy;
      for(const rule of profile.rules){
        for(const host of rule.hosts){
          // override default proxy if find host in rules
          if(urlObject.host.endsWith(host)){
            // host <a.b.com> matchs rule <b.com> too
            proxyName = rule.proxyName;
          }
        }
      }
    }
  }
  let proxyInfo = data.proxies[proxyName];
  return {proxyName, proxyInfo};
}