(() => {
    const summarizeEl = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const texts = typeof collectActionTexts === 'function' ? collectActionTexts(el) : [];
        const closestLi = el.closest('li');
        return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            title: el.getAttribute('title') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            ariaControls: el.getAttribute('aria-controls') || '',
            ariaExpanded: el.getAttribute('aria-expanded') || '',
            href: el.getAttribute('href') || '',
            text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
            texts,
            liText: closestLi ? (closestLi.innerText || closestLi.textContent || '').replace(/\s+/g, ' ').trim() : '',
            rect: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            },
        };
    };

    const items = typeof getTopLevelSidebarItems === 'function'
        ? getTopLevelSidebarItems().map(({ control, item, rect, texts, title, itemText }) => ({
            control: summarizeEl(control),
            title,
            texts,
            itemText,
            rect: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            },
        }))
        : [];

    const classInformation = typeof findClassInformationButton === 'function' ? findClassInformationButton() : null;
    const ownerByControls = typeof findSidebarOwnerControl === 'function'
        ? findSidebarOwnerControl('HPT_CX_CLASS_INFORMATION_CHILDREN')
        : null;
    const directQuery = typeof getDashboardSidebarRoot === 'function'
        ? getDashboardSidebarRoot()?.querySelector('button[title="Class Information"], a[title="Class Information"], [role="button"][title="Class Information"]') || null
        : null;
    const sectionMatch = typeof findSidebarSectionButton === 'function'
        ? findSidebarSectionButton(/^Class Information$/i, 'HPT_CX_CLASS_INFORMATION_CHILDREN')
        : null;
    const navTargets = typeof getTrackerNavigationTargets === 'function' ? getTrackerNavigationTargets() : null;
    const tutorialStep = typeof featureTutorialState !== 'undefined' ? featureTutorialState.step : '';

    return {
        href: location.href,
        tutorialStep,
        sidebarExists: !!(typeof getDashboardSidebarRoot === 'function' && getDashboardSidebarRoot()),
        classInformation: summarizeEl(classInformation),
        ownerByControls: summarizeEl(ownerByControls),
        directQuery: summarizeEl(directQuery),
        sectionMatch: summarizeEl(sectionMatch),
        navTargets: navTargets ? {
            classInformation: summarizeEl(navTargets.classInformation),
            classInformationExpanded: navTargets.classInformationExpanded,
            classSearch: summarizeEl(navTargets.classSearch),
        } : null,
        topLevelItems: items,
    };
})()
