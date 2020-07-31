const storage = browser.storage.sync;
const defaultData = {
  active: { type: "proxy", name: "example" },
  proxies: {
    direct: {type: 'direct'},
    example: {
      type: "socks",
      host: "127.0.0.1",
      port: "8480"
    },
  },
  profiles: {
    example:{
      defaultProxy: "direct",
      rules: [
        {proxy: 'example', urls: []}
      ],
    },
},
};

let data = null;
storage.get(null, (result) => {
  if (browser.runtime.lastError) {
    console.log(browser.runtime.lastError);
    data = defaultData;
  } else if (Object.keys(result).length == 0) {
    data = defaultData;
  } else {
    data = result;
  }
  
  browser.proxy.onRequest.addListener(handleRequest, {urls: ["<all_urls>"]});
  browser.runtime.onMessage.addListener(msgHandler);

  // change addon icon when using proxy
  browser.tabs.onActivated.addListener(activeInfo=>{
    browser.tabs.get(activeInfo.tabId).then(tab=>{
      console.log(tab);
      if(tab.url){
        setIcon(tab.url);
      }else{
        // url might not be set when tab is activated, use onUpdated instead
        browser.tabs.onUpdated.addListener(handleTabUpdate, {tabId: tab.tabId});
      }
    }).catch(error=>{
      console.error(error);
    });
  });
});

function msgHandler(msg, sender, sendResponse){
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
    proxyInfo = {...data.proxies[data.active.name]};
  }else{
    const profile = data.profiles[data.active.name];
    for(const rule of profile.rules){
      if(rule.urls.includes(requestInfo.documentUrl)){
        let proxy = data.proxies[rule.proxy] || data.proxies[rule.defaultProxy];
        proxyInfo = {...proxy};
      }
    }
  }
  console.log(requestInfo, proxyInfo);
  return proxyInfo;
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

function handleTabUpdate(tabId, changeInfo, tab){
  setIcon(tab.url);
  browser.tabs.removeListener(handleTabUpdate);
}