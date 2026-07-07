const tabsApi = window.scratchDesktopTabs;

// 首页不创建编辑器实例，只把用户选择的模式交给主进程创建新 tab。
document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
        tabsApi.create({
            mode: button.dataset.mode
        });
    });
});
