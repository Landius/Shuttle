const dm = {
    '$': selector=>{ return document.querySelector(selector); },
    '$$': selector=>{ return document.querySelectorAll(selector); }
};
const proxyTile = dm.$('#proxy-tile');
const profileTile = dm.$('#profile-tile');
const optionTile = dm.$('#option-tile');
const proxyDetail = dm.$('#proxy-detail');
const profileDetail = dm.$('#profile-detail');

browser.runtime.sendMessage({cmd: 'getData'}).then(renderMain);

function renderMain(data){
    window.data = data;
    // add li elements to sidebar
    for(const key in data.proxies){
        if(key == 'direct') continue; // don't show <direct>
        const attribs = {'data-type': 'proxy'};
        addLi(key, attribs, proxyTile, switchLi);
    }
    for(const key in  data.profiles){
        const attribs = {'data-type': 'profile'};
        addLi(key, attribs, profileTile, switchLi);
    }
    addLi('Setting', {'data-type': 'setting'}, optionTile, switchLi);
    addLi('About', {'data-type': 'about'}, optionTile, switchLi);

    dm.$('#sidebar li').click();

    // bind functions
    dm.$('#new-proxy').onclick = newProxy;
    dm.$('#new-profile').onclick = newProfile;

    dm.$('#delete-proxy').onclick = deleteProxy;
    dm.$('#confirm-proxy').onclick = confirmProxy;
    dm.$('#cancel-proxy').onclick = cancel;

    dm.$('#delete-profile').onclick = deleteProfile;
    dm.$('#confirm-profile').onclick = confirmProfile;
    dm.$('#cancel-profile').onclick = cancel;
}

function addLi(label, attribs, parentEl, callback){
    const li = document.createElement('li');
    li.innerText = label;
    for(const attr in attribs){
        li.setAttribute(attr, attribs[attr]);
    }
    li.addEventListener('click', callback);
    parentEl.append(li);
    return li;
}

function switchLi(e){
    window.activeLi = e.target;
    const data = window.data;
    const t = e.target;
    // set li style by class attr
    const allLi = dm.$$('#sidebar li');
    for(const li of allLi){
        if(li == t){
            li.classList.add('active');
        }else{
            li.classList.remove('active');
        }
    }
    switch (t.dataset.type) {
        case 'proxy':
            renderProxyDetail(t.innerText);
            break;
        case 'profile':
            renderProfileDetail(t.innerText);
            break;
        case 'setting':
            renderSetting(data.setting);
            break;
        default:
            break;
    }
}

function renderProxyDetail(proxyName){
    window.editing = {name: proxyName, type: 'proxy'};
    // set style by class attr
    for(const div of dm.$$('#detail-tile > div')){
        if(div.id == 'proxy-detail'){
            div.classList.add('active');
        }else{
            div.classList.remove('active');
        }
    }
    // map proxy keys and element selectors
    const proxyInfo = window.data.proxies[proxyName] || {};
    const map = {
        type: '#proxy-type',
        host: '#proxy-host',
        port: '#proxy-port',
        username: '#proxy-usr',
        password: '#proxy-pwd',
        proxyDNS: '#proxy-dns'
    };
    // fill proxy detail
    dm.$('#proxy-name').value = proxyName;
    for(const key in map){
        if(key == 'proxyDNS'){
            dm.$(map[key]).checked = proxyInfo[key] || false;
        }else{
            dm.$(map[key]).value = proxyInfo[key] || '';
        }
    }
}

function renderProfileDetail(profileName) {
    window.editing = {name: profileName, type: 'profile'};
    // set style by class attr
    for(const div of dm.$$('#detail-tile > div')){
        if(div.id == 'profile-detail'){
            div.classList.add('active');
        }else{
            div.classList.remove('active');
        }
    }
    //  map profile keys and element selectors
    const profileInfo = window.data.profiles[profileName] || {defaultProxy: undefined, rules:[]};
    const proxyKeys = Object.keys(window.data.proxies);
    // fill profile info
    const profileNameEl = dm.$('#profile-name');
    const defaultProxyEl = dm.$('#default-proxy');
    const rulesEl = dm.$('#rules');
    profileNameEl.value = profileName;
    defaultProxyEl.innerHTML = ''; // clean old options
    addOption(defaultProxyEl, proxyKeys);
    defaultProxyEl.value = profileInfo.defaultProxy;
    rulesEl.innerHTML = '';
    for(const rule of profileInfo.rules){
        for(const host of rule.hosts){
            addRule(host, rule.proxyName);
        }
    }
    // handle delete-rule btn event
    rulesEl.addEventListener('click', e=>{
        const t = e.target;
        if(t.classList.contains('delete-rule')){
            t.parentElement.remove();
        }
    });
    // handle add-rule btn event
    dm.$('#add-rule').onclick = e=>{ addRule('', ''); };

    function addOption(parent, options){
        for(const option of options){
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.innerText = option;
            parent.append(optionEl);
        }
    }

    function addRule(host, proxyName){
        // create elements
        const ruleEl = document.createElement('div');
        const hostInput = document.createElement('input');
        const proxySelect = document.createElement('select');
        const deleteBtn = document.createElement('button');
        // add classes
        ruleEl.classList.add('rule');
        hostInput.classList.add('host');
        proxySelect.classList.add('proxy');
        deleteBtn.classList.add('delete-rule');
        // fill values
        hostInput.value = host;
        addOption(proxySelect, proxyKeys);
        proxySelect.value = proxyName;
        deleteBtn.innerText = 'delete';
        // append
        ruleEl.append(hostInput, proxySelect, deleteBtn);
        rulesEl.append(ruleEl)
    }
}

function renderSetting(setting){

}

function newProxy(){
    let proxyName = prompt('proxy name:');
    while(proxyName == null || proxyName == '' || proxyName == 'direct' || proxyName == 'new'){
        if(proxyName == null) return;
        alert(`invalid name: "${proxyName}"`);
        proxyName = prompt('proxy name');
    }
    const newProxyLi = addLi(proxyName, {'data-type': 'proxy'}, proxyTile, switchLi);
    newProxyLi.click();
}

function newProfile() {
    let profileName = prompt('profile name:');
    while(profileName == null || profileName == '' || profileName == 'direct' || profileName == 'new'){
        if(profileName == null) return;
        alert(`invalid name: "${profileName}"`);
        profileName = prompt('profile name');
    }
    const newProfileLi = addLi(profileName, {'data-type': 'profile'}, profileTile, switchLi);
    newProfileLi.click();
}

function deleteProxy() {
    delete window.data.proxies[window.editing.name];
    saveData().then(result=>{
        // refresh page
        location.href = location.href
    });
}

function deleteProfile() {
    delete window.data.profiles[window.editing.name];
    saveData().then(result=>{
        // refresh page
        location.href = location.href
    });
}

function confirmProxy() {
    // todo: validate values

    // get proxy info
    const proxyName = dm.$('#proxy-name').value;
    const map = {
        type: '#proxy-type',
        host: '#proxy-host',
        port: '#proxy-port',
        username: '#proxy-usr',
        password: '#proxy-pwd',
        proxyDNS: '#proxy-dns'
    };
    const proxyInfo = {};
    for(const key in map){
        const value = key == 'proxyDNS' ? dm.$(map[key]).checked : dm.$(map[key]).value;
        if(value){
            proxyInfo[key] = value;
        }
    }
    // change Li innerText
    window.activeLi.innerText = proxyName;
    // delete old proxy
    delete window.data.proxies[window.editing.name];
    // add new proxy
    window.data.proxies[proxyName] = proxyInfo;
    // save to storage
    saveData();
}

function confirmProfile() {
    // todo: validate values before modifing profile

    // get profile info
    const profile = {defaultProxy: undefined, rules: []}; // init an empty profile
    const profileName = dm.$('#profile-name').value;
    const allRuleEl = dm.$$('.rule') || [];
    for(const ruleEl of allRuleEl){
        // get value
        const host = ruleEl.children[0].value;
        const proxyName = ruleEl.children[1].value;
        // set rule
        let isAdded = false;
        for(const rule of profile.rules){
            if(rule.proxyName == proxyName){
                rule.hosts.push(host);
                isAdded = true;
            }
        }
        if(isAdded == false){ // no match proxyName
            profile.rules.push({proxyName: proxyName, hosts: [host]});
        }
    }
    // change Li innerText to new profile name
    window.activeLi.innerText = profileName;
    // delete old profile
    delete window.data[window.editing.name];
    // add new profile
    window.data.profiles[profileName] = profile;
    // save to storage
    saveData();
}

function cancel(){
    window.activeLi.click();
}

function saveData() {
    return browser.runtime.sendMessage({cmd: 'setData', data: window.data}).then(result=>{
        console.log('data saved');
    }).catch(error=>{
        alert('error on saving data:' + error);
    });
}