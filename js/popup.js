browser.runtime.sendMessage({cmd: 'getData'}, result=>{
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
        // todo
        const panel = d.querySelector('#editPanel');
        const url = new URL(browser.tabs.query())
        d.querySelector('#main').style.display = 'none';
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