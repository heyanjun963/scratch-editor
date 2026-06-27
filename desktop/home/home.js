const tabsApi = window.scratchDesktopTabs;

document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
        tabsApi.create({
            mode: button.dataset.mode
        });
    });
});
