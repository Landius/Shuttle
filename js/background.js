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
        {proxy: 'example', urls: []}
      ],
    },
},
};
// init data
let data = null;
let activeTab = {id: -1, url: ''}; 
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
  browser.proxy.onRequest.addListener(handleRequest, {urls: ["<all_urls>"]});
  browser.proxy.onError.addListener(error=>{
    console.error(error);
  });
  // handle msg
  browser.runtime.onMessage.addListener(handleMsg);

  // change addon icon if current page is using proxy
  browser.tabs.onActivated.addListener(handleTabEvent);
  browser.tabs.onUpdated.addListener(handleTabEvent, {
    properties:['status'],
    windowId: browser.windows.WINDOW_ID_CURRENT
  });
  browser.windows.onFocusChanged.addListener(handleTabEvent);
});


function handleMsg(msg, sender, sendResponse){
  switch (msg.cmd) {
    case 'getData':
      sendResponse(data);
      break;
    case 'setActive':
      data.active = msg.active;
      break;
    case 'addRule':
      addRule(msg.profileName, msg.rule);
      break;
    case 'removeRule':
      removeRule(msg.profileName, msg.rule);
    default:
      break;
  }
}

function handleRequest(requestInfo){
  let proxyInfo = {};
  if(data.active.type == 'proxy'){
    let proxy = data.proxies[data.active.name];
    proxyInfo = {...proxy};
  }else{
    const profile = data.profiles[data.active.name];
    const host = (new URL(requestInfo.documentUrl)).host;
    for(const rule of profile.rules){
      if(rule.urls.includes(host)){
        let proxy = data.proxies[rule.proxy] || data.proxies[rule.defaultProxy];
        proxyInfo = {...proxy};
      }
    }
  }
  // console.log(requestInfo, proxyInfo);
  return proxyInfo;
}

function handleTabEvent(){
  const winId = browser.windows.WINDOW_ID_CURRENT;
  browser.tabs.query({active: true, windowId: winId}).then(result=>{
    if(result.length != 1){
      console.error('result of tabs.query:', result);
    }else{
      activeTab.id = result[0].id;
      activeTab.url = result[0].url;
      setIcon(activeTab.url);
    }
  }).catch(error=>{ console.error(error); });
}

function setIcon(url){
  const urlObject = new URL(url);
  const normalIcon = { path: "img/icon.svg" };
  const activeIcon = { path: "img/icon_filled.svg" };
  let icon = null;
  if(urlObject.protocol == "about:" || urlObject.protocol == 'moz-extension:'){
    icon = normalIcon;
  }else if(data.active.type == 'proxy'){
    if(data.active.name == 'direct'){
      icon = normalIcon;
    }else{
      icon = activeIcon;
    }
  }else if(data.active.type == 'profile'){
    let host = urlObject.host;
    let profile = data.profiles[data.active.name];
    if(profile.defaultProxy == 'direct'){
      for(let rule of profile.rules){
        if(rule.urls.includes(host) && rule.proxy != 'direct'){
          icon = activeIcon;
        }
      }
    }else if(profile.defaultProxy != 'direct'){
      icon = activeIcon;
      for(let rule of profile.rules){
        if(rule.urls.includes(host) && rule.proxy == 'direct'){
          icon = normalIcon;
        }
      }
    }
  }
  browser.browserAction.setIcon(icon);
}