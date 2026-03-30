(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    welcome: !!document.getElementById('thr-dashboard-welcome'),
    launcher: !!document.getElementById('thr-dashboard-launcher'),
    panel: !!document.getElementById('thr-dashboard-tour-panel'),
    guide: !!document.getElementById('thr-dashboard-tour-guide'),
    bodyWelcomeOpen: document.body.classList.contains('thr-dashboard-welcome-open'),
    htmlWelcomeOpen: document.documentElement.classList.contains('thr-dashboard-welcome-open'),
    headings: [...document.querySelectorAll('h1,h2,h3,[role="heading"]')]
        .map((el) => (el.innerText || el.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 20),
    text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 800),
}))()
