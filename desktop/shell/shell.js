const tabsApi = window.scratchDesktopTabs;
const tabStrip = document.getElementById('tabStrip');
const homeButton = document.getElementById('homeButton');
const newTabButton = document.getElementById('newTabButton');

let currentTabs = [];
let activeTabId = null;

const renderTabs = () => {
    tabStrip.replaceChildren();
    homeButton.classList.toggle('active', activeTabId === null);

    for (const tab of currentTabs) {
        const tabButton = document.createElement('button');
        tabButton.type = 'button';
        tabButton.className = [
            'tab',
            tab.active ? 'active' : '',
            tab.loading ? 'loading' : '',
            tab.crashed ? 'crashed' : ''
        ].filter(Boolean).join(' ');
        tabButton.title = tab.title;
        tabButton.dataset.tabId = tab.id;

        if (tab.dirty) {
            const dirty = document.createElement('span');
            dirty.className = 'tab-dirty';
            dirty.setAttribute('aria-hidden', 'true');
            tabButton.appendChild(dirty);
        }

        const title = document.createElement('span');
        title.className = 'tab-title';
        title.textContent = tab.title;
        tabButton.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'tab-close';
        closeButton.title = `关闭 ${tab.title}`;
        closeButton.setAttribute('aria-label', `关闭 ${tab.title}`);
        closeButton.textContent = '×';
        closeButton.addEventListener('click', event => {
            event.stopPropagation();
            tabsApi.close(tab.id);
        });
        tabButton.appendChild(closeButton);

        tabButton.addEventListener('click', () => {
            if (tab.id !== activeTabId) tabsApi.activate(tab.id);
        });

        tabStrip.appendChild(tabButton);
    }
};

const applyTabsPayload = payload => {
    currentTabs = payload.tabs || [];
    activeTabId = payload.activeTabId || null;
    renderTabs();
};

const loadTabs = async () => {
    applyTabsPayload(await tabsApi.list());
};

newTabButton.addEventListener('click', () => {
    tabsApi.showHome();
});

homeButton.addEventListener('click', () => {
    tabsApi.showHome();
});

tabsApi.onChanged(applyTabsPayload);
loadTabs();
