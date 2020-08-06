const dm = {
    '$': selector=>{ return document.querySelector(selector); },
    '$$': selector=>{ return document.querySelectorAll(selector); }
};
const originalHTML = dm.$('#main-panel').innerHTML;
browser.runtime.sendMessage({cmd: 'getActiveTab'}).then(renderStatus);

function renderStatus(activeTab){
    window.activeTab = activeTab;
    const urlObject = new URL(activeTab.url);
    const supportedProtocol = ["http:", "https:", "ws:", "wss:", "ftp:", "ftps:"];
    const isSupported = supportedProtocol.includes(urlObject.protocol);
    const isProfile = activeTab.currentActive.type == 'profile' ? true : false;
    let hostInfo, statusInfo;
    if(isSupported){
        hostInfo = urlObject.host;
        statusInfo = activeTab.currentProxy;
        if(isProfile){
            statusInfo = activeTab.currentActive.name + ' => ' + statusInfo;
        }
    }else{
        hostInfo = urlObject.protocol + '*';
        statusInfo = 'ignored';
    }
    dm.$('#host-span').innerText = hostInfo;
    dm.$('#status-span').innerText = statusInfo;
    dm.$('#switch-btn').addEventListener('click', switchProxy);
    dm.$('#edit-btn').addEventListener('click', editRule);
    dm.$('#edit-btn').style.display = isProfile && isSupported ? 'inline' : 'none';
    dm.$('#option-btn').addEventListener('click', e=>{
        browser.tabs.create({url: './option.html', active: true});
        window.close();
    });
}

function switchProxy(){
    browser.runtime.sendMessage({cmd:'getData'}).then(data=>{
        const proxiesDiv = dm.$('#proxies');
        const profilesDiv = dm.$('#profiles');
        // add proxy btns
        for(const key in data.proxies){
            const proxy = data.proxies[key];
            const attribs = {
                'data-name': key,
                'data-type': 'proxy'
            };
            if(data.active.type == 'proxy' && key == data.active.name){
                attribs.class = 'active';
            }
            addBtn(key, attribs, proxiesDiv, setActive);
        }
        // add profile btns
        for(const key in data.profiles){
            const profile = data.profiles[key];
            const attribs = {
                'data-name': key,
                'data-type': 'profile'
            };
            if(data.active.type == 'profile' && key == data.active.name){
                attribs.class = 'active';
            }
            addBtn(key, attribs, profilesDiv, setActive);
        }
        
        // show panel
        dm.$('#main-panel').style.display = 'none';
        dm.$('#switch-panel').style.display = 'block';

        function setActive(e) {
            const dataset = e.target.dataset;
            browser.runtime.sendMessage({
                cmd: 'setActive',
                active: {
                    type: dataset.type,
                    name: dataset.name
                }
            }, e=>{ window.close(); });
        }
    });
}

function addBtn(label, attribs, parentEl, callback){
    let btn = document.createElement('button');
    btn.innerText = label;
    for(let key in attribs){
        btn.setAttribute(key, attribs[key]);
    }
    btn.addEventListener('click', callback);
    parentEl.append(btn);
    return btn;
}

function editRule(){
    browser.runtime.sendMessage({cmd:'getData'}).then(data=>{
        // get top domain name
        const host = new URL(window.activeTab.url).host;
        const hostInput = dm.$('#host-input');
        const profileSelection = dm.$('#profile-selection');
        // fill host input
        hostInput.value = host;
        // add proxy btns
        for(const key in data.proxies){
            const proxy = data.proxies[key];
            const attribs = {
                'data-name': key,
                'data-type': 'proxy'
            };
            if(key == window.activeTab.currentProxy){
                attribs.class = 'active';
            }
            addBtn(key, attribs, profileSelection, chooseProxy);
        }
        
        // show panel
        dm.$('#main-panel').style.display = 'none';
        dm.$('#edit-panel').style.display = 'block';
        hostInput.focus();

        function chooseProxy(e) {
            const dataset = e.target.dataset;
            browser.runtime.sendMessage({
                cmd: 'editRule',
                rule: {
                    proxyName: dataset.name,
                    host: hostInput.value
                }
            }, e=>{ window.close(); });
        }
    });
}