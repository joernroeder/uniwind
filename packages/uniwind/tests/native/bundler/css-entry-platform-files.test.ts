import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { UniwindBundlerConfig } from '../../../src/bundler/config'

/**
 * `cssPath` resolves against `process.cwd()`, so the entry is handed over as a path relative to
 * it rather than chdir-ing the worker.
 */
const withEntries = (entries: Array<string>, assert: (cssEntryFile: string) => void) => {
    const root = mkdtempSync(join(tmpdir(), 'uniwind-css-entry-'))

    try {
        entries.forEach(entry => writeFileSync(join(root, entry), ''))

        assert(relative(process.cwd(), join(root, 'global.css')))
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
}

test('uses the configured entry when no platform file sits beside it', () => {
    withEntries(['global.css'], cssEntryFile => {
        const forWeb = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'web')
        const forIOS = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'ios')

        expect(forWeb.cssPath.endsWith('global.css')).toBe(true)
        expect(forIOS.cssPath.endsWith('global.css')).toBe(true)
    })
})

test('prefers a platform file over the configured entry', () => {
    withEntries(['global.css', 'global.web.css'], cssEntryFile => {
        const forWeb = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'web')
        const forIOS = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'ios')

        expect(forWeb.cssPath.endsWith('global.web.css')).toBe(true)
        expect(forIOS.cssPath.endsWith('global.css')).toBe(true)
    })
})

test('falls back from a platform file to the native one', () => {
    withEntries(['global.css', 'global.native.css'], cssEntryFile => {
        const forIOS = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'ios')
        const forAndroid = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'android')

        expect(forIOS.cssPath.endsWith('global.native.css')).toBe(true)
        expect(forAndroid.cssPath.endsWith('global.native.css')).toBe(true)
    })
})

test('takes the more specific platform file when both exist', () => {
    withEntries(['global.css', 'global.native.css', 'global.ios.css'], cssEntryFile => {
        const forIOS = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'ios')
        const forAndroid = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'android')

        expect(forIOS.cssPath.endsWith('global.ios.css')).toBe(true)
        expect(forAndroid.cssPath.endsWith('global.native.css')).toBe(true)
    })
})

// Metro resolves `.native` for native platforms only, and web is not one of them.
test('never falls back to the native file on web', () => {
    withEntries(['global.css', 'global.native.css'], cssEntryFile => {
        const forWeb = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'web')

        expect(forWeb.cssPath.endsWith('global.css')).toBe(true)
    })
})

test('resolves the TV entries when isTV maps the platform', () => {
    withEntries(['global.css', 'global.native.css', 'global.ios.css', 'global.apple-tv.css'], cssEntryFile => {
        const forAppleTV = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile, isTV: true }, 'ios')

        expect(forAppleTV.cssPath.endsWith('global.apple-tv.css')).toBe(true)
    })
})

test('an absent platform argument resolves the native entry', () => {
    withEntries(['global.css', 'global.native.css'], cssEntryFile => {
        const forNative = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile })

        expect(forNative.cssPath.endsWith('global.native.css')).toBe(true)
    })
})
