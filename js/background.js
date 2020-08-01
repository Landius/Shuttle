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
        {proxyName: 'example', hosts: []}
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
let activeTab = {id: -1, url: '', currentProxy: 'direct'}; 
storage.get(null, (result) => {
  if (browser.runtime.lastError) {
    console.log(browser.runtime.lastError);
    data = defaultData;
  } else if (Object.keys(result).length == 0) {
    data = defaultData;
  } else {
    data = result;
  }
  // handle requests
  browser.proxy.onRequest.addListener(requestInfo=>{
    let url = requestInfo.documentUrl;
    if(url == undefined){
      console.log(requestInfo);
      url = requestInfo.url;
    }
    let proxy = getProxyByUrl(url);
    return proxy.proxyInfo;
  }, {urls: ["<all_urls>"]});

  browser.proxy.onError.addListener(error=>{
    console.error(error);
  });

  // handle msg
  browser.runtime.onMessage.addListener(handleMsg);


  setIcon(); // init icon

  // change addon icon if current page is using proxy
  browser.tabs.onActivated.addListener(setIcon);
  browser.tabs.onUpdated.addListener(setIcon, {
    properties:['status'],
    windowId: browser.windows.WINDOW_ID_CURRENT
  });
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
    case 'setActive':
      data.active = msg.active;
      setIcon();
      break;
    case 'editRule':
      editRule(msg.rule);
      setIcon();
      sendResponse();
      break;
    default:
      break;
  }
}

function setIcon(){
  const winId = browser.windows.WINDOW_ID_CURRENT;
  browser.tabs.query({active: true, windowId: winId}).then(result=>{
    if(result.length != 1){
      console.error('result of tabs.query:', result);
    }else{
      const proxy = getProxyByUrl(result[0].url);
      activeTab.id = result[0].id;
      activeTab.url = result[0].url;
      activeTab.currentProxy = proxy.proxyName;
      activeTab.currentActive = data.active;
      let state = (proxy.proxyName == 'direct' ? 'NORMAL' : 'ACTIVE');
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
        if(rule.hosts.includes(urlObject.host)){
          // override default proxy if find host in rules
          proxyName = rule.proxy;
        }
      }
    }
  }
  let proxyInfo = data.proxies[proxyName];
  return {proxyName, proxyInfo};
}