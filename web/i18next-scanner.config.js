module.exports = {
    input: [
        'apps/**/src/**/*.{js,jsx,ts,tsx}',
        'libs/**/src/**/*.{js,jsx,ts,tsx}',
        // Exclude generated/bin and SDK helper scripts that are not meant for UI extraction
        '!libs/**/src/**/bin/**',
        '!libs/**/src/**/sdk/**'
    ],
    output: './locales/$LOCALE/$NAMESPACE.json',
    options: {
        debug: false,
        removeUnusedKeys: false,
        sort: true,
        lngs: ['en', 'zh-CN'],
        ns: ['translation'],
        defaultLng: 'en',
        defaultNs: 'translation',
        resource: {
            loadPath: 'web/locales/{{lng}}/{{ns}}.json',
            savePath: 'web/locales/{{lng}}/{{ns}}.json',
            jsonIndent: 2,
        },
        keySeparator: false,
        nsSeparator: false,
    }
};
