const log = {
  info: (...msg)=>{ if(data.setting.enable_logging) console.info(msg); },
  log: (...msg)=>{ if(data.setting.enable_logging) console.log(msg); },
  warn: (...msg)=>{ if(data.setting.enable_logging) console.warn(msg); },
  error: (...msg)=>{ if(data.setting.enable_logging) console.error(msg); }
};
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
  setting: {
    refresh_after_switch: true,
    enable_for_extension: true,
    enable_logging: false
  }
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

storage.get(null, (result) => {
  if(browser.runtime.lastError || Object.keys(result).length == 0){
    log.warn(browser.runtime.lastError || 'storage is empty');
    data = defaultData;
    storage.set(data);
  }else{
    data = result;
  }

  // handle requests
  browser.proxy.onRequest.addListener(handleRequest, {urls: ["<all_urls>"]});
  browser.proxy.onError.addListener(error=>{ log.warn('proxy.onError: ', error); });
  browser.webRequest.onAuthRequired.addListener(handleAuth, {urls: ["<all_urls>"]}, ["blocking"]);
  browser.webRequest.onErrorOccurred.addListener(error=>{ log.warn('webRequest.onErrorOccurred: ', error); }, {urls: ["<all_urls>"]});

  // handle msg
  browser.runtime.onMessage.addListener(handleMsg);

  // init icon
  setIcon();

  // change addon icon if current page is using proxy
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo)=>{
    // set icon if url has changed
    if(changeInfo.url) setIcon();
  });
  browser.tabs.onActivated.addListener(setIcon); // maybe use changeInfo.attention of onUpdated is better?
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
      refresh();
      break;
    case 'editRule':
      editRule(msg.rule);
      storage.set(data);
      setIcon();
      refresh();
      sendResponse();
      break;
    default:
      log.warn('Unsupported msg:', msg);
      break;
  }
}

function handleRequest(requestInfo){
  log.log('fn: handleRequest, var: requestInfo)', requestInfo);
  let url, proxyInfoPromise;
  if(requestInfo.documentUrl){
    url = (requestInfo.documentUrl.startsWith('moz-extension://') && data.setting.enable_for_extension) ? 
      requestInfo.url : requestInfo.documentUrl;
  }else if(requestInfo.tabId == -1 || 'about:blank'){
    // when the request does not belong a tab or belongs to a new tab, just pass the url
    url = requestInfo.url;
  }else{
    proxyInfoPromise = browser.tabs.get(requestInfo.tabId).then(tab=>{
      if(tab.url){
        return getProxyByUrl(tab.url).proxyInfo;
      }else{
        log.warn('undefined tab.url, tab & requestInfo below: \n', tab, requestInfo);
        return data.active.type == 'proxy' ? data.proxies[data.active.name] : data.proxies[data.profiles[data.active.name].proxyName];
      }
    }).catch(error=>{
      log.warn('Error in onRequest():', error);
    });
  }
  return proxyInfoPromise || getProxyByUrl(url).proxyInfo;
}

function handleAuth(detail){
  if(detail.isProxy && detail.proxyInfo.type.includes('http')){
    let blockResponse = null;
    const keys = ['type', 'host', 'port'];
    for(const name in data.proxies){
      const proxy = data.proxies[name];
      if(keys.every(key=>{ return detail.proxyInfo[key] == proxy[key]; })){
        blockResponse = {
          authCredentials: {username: proxy.username, password: proxy.password}
        };
        log.log('fn: handleAuth, var: blockResponse', blockResponse);
        return blockResponse;
      }
    }
  }
}

function setIcon(){
  const winId = browser.windows.WINDOW_ID_CURRENT;
  browser.tabs.query({active: true, windowId: winId}).then(result=>{
    if(result.length != 1){
      log.warn('result of tabs.query:', result);
    }else{
      activeTab.id = result[0].id;
      activeTab.url = result[0].url;
      activeTab.currentProxy = getProxyByUrl(activeTab.url).proxyName;
      activeTab.currentActive = data.active;
      let state = (activeTab.currentProxy == 'direct' ? 'NORMAL' : 'ACTIVE');
      if(state != icon.state){
        // only change icon if needed
        browser.browserAction.setIcon(icon[state]);
        icon.state = state;
      }
    }
  }).catch(error=>{ log.error(error); });
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
  log.log('fn: getProxyByUrl, var: url, proxyName, proxyInfo', url, proxyName, proxyInfo);
  return {proxyName, proxyInfo};
}

function refresh(){
  if(data.setting.refresh_after_switch){
    // browser.tabs.update(activeTab.id, {url: activeTab.url});
    browser.tabs.reload(activeTab.id);
  }
}