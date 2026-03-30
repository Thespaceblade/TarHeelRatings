(() => ({
    href: globalThis.location?.href || '',
    constructorName: globalThis.constructor?.name || '',
    runtimeId: globalThis.chrome?.runtime?.id || '',
    hasStorage: !!globalThis.chrome?.storage?.local,
    chromeKeys: Object.keys(globalThis.chrome || {}).slice(0, 30),
}))()
