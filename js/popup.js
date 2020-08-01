browser.runtime.sendMessage({cmd: 'getData'}).then(result=>{
    const d = document;
    const data = result;
    const proxyTile = d.querySelector('#proxy-tile');
    const profileTile = d.querySelector('#profile-tile');
    const editTile = d.querySelector('#edit-tile');
    const optionTile = d.querySelector('#option-tile');
    // add proxy btns
    for(const key in data.proxies){
        const proxy = data.proxies[key];
        const attribs = {
            'data-name': key,
            'data-type': 'proxy'
        };
        addBtn(key, attribs, proxyTile, setActive);
    }
    // add profile btns
    for(const key in data.profiles){
        const profile = data.profiles[key];
        const attribs = {
            'data-name': key,
            'data-type': 'profile'
        };
        addBtn(key, attribs, profileTile, setActive);
    }
    // add edit btn if data.active.type == profile
    if(data.active.type == 'profile'){
        addBtn('edit', {}, editTile, editRule);
    }
    // add option btn
    addBtn('option', {}, optionTile, e=>{
        const url = './options.html';
        browser.tabs.create({url: url, active: true});
        window.close();
    });

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
        browser.runtime.sendMessage({msg:'getActiveTab'}).then(activeTab=>{
            const panel = d.querySelector('#editPanel');
            const hostInput = d.querySelector('input#current-host');
            const selectProxyTile = d.querySelector('#select-proxy-tile');
            const host = (new URL(activeTab.url)).host;
            // fill host input
            hostInput.value = host;
            // add proxy options
            
            for(const key in data.proxies){
                const proxy = data.proxies[key];
                const attribs = {
                    'data-name': key
                };
                addBtn(key, attribs, selectProxyTile, chooseProxy);
            }
            // show panel
            d.querySelector('#switchPanel').style.display = 'none';
            panel.style.display = 'block';
        }).catch(error=>{
            console.error(error);
        });

        function chooseProxy(e){
            const dataset = e.target.dataset;
            const msg = {
                cmd: 'editRule',
                rule: {
                    host: hostInput.value,
                    proxyName: dataset.name
                }
            };
            browser.runtime.sendMessage(msg).then(()=>{
                d.querySelector('#switchPanel').style.display = 'block';
                panel.style.display = 'none';
            });
            
        }
    }

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