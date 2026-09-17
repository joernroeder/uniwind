import { buildCSS } from '@/bundler/artifacts/css'
import { buildDtsFile } from '@/bundler/artifacts/dts'
import { UniwindCSSVisitor } from '@/bundler/css-visitor'
import type { UniwindConfig, UniwindMetroConfig } from '@/bundler/types'
import { Platform } from '@/common/consts'
import { isDefined } from '@/common/utils'
import fs from 'fs'
import path from 'path'

/**
 * Which suffixed entries a platform accepts, most specific first.
 *
 * Mirrors how Metro resolves `.ios` / `.native` modules, including that web never falls back
 * to `.native`. The suffixes are the platform variants Uniwind already generates, so an entry
 * is named after the prefix you would otherwise write inside it.
 */
const CSS_ENTRY_PLATFORM_FALLBACKS: Record<Platform, Array<Platform>> = {
    [Platform.Web]: [Platform.Web],
    [Platform.iOS]: [Platform.iOS, Platform.Native],
    [Platform.Android]: [Platform.Android, Platform.Native],
    [Platform.Native]: [Platform.Native],
    [Platform.TV]: [Platform.TV, Platform.Native],
    [Platform.AndroidTV]: [Platform.AndroidTV, Platform.TV, Platform.Android, Platform.Native],
    [Platform.AppleTV]: [Platform.AppleTV, Platform.TV, Platform.iOS, Platform.Native],
}

export class UniwindBundlerConfig {
    static fromMetroConfig(config: UniwindMetroConfig, platform?: string | null) {
        const getPlatform = () => {
            if (!isDefined(platform)) {
                return Platform.Native
            }

            if (!config.isTV) {
                return platform as Platform
            }

            if (platform === Platform.Android) {
                return Platform.AndroidTV
            }

            if (platform === Platform.iOS) {
                return Platform.AppleTV
            }

            throw new Error(`Platform ${platform} not supported`)
        }

        if (typeof config === 'undefined') {
            throw new Error('Uniwind: You need to pass second parameter to withUniwindConfig')
        }

        if (typeof config.cssEntryFile === 'undefined') {
            throw new Error(
                'Uniwind: You need to pass css css entry file to withUniwindConfig, e.g. withUniwindConfig(config, { cssEntryFile: "./global.css" })',
            )
        }

        return new UniwindBundlerConfig(config, getPlatform())
    }

    static fromViteConfig(config: UniwindConfig) {
        return new UniwindBundlerConfig(config, Platform.Web)
    }

    static fromCliConfig(config: UniwindConfig) {
        if (typeof config.cssEntryFile === 'undefined') {
            throw new Error(
                'Uniwind: You need to pass css entry file, e.g. uniwind generate-artifacts --css ./global.css. Run uniwind generate-artifacts --help for usage.',
            )
        }

        return new UniwindBundlerConfig(config, Platform.Web)
    }

    constructor(private readonly config: UniwindMetroConfig, readonly platform: Platform) {}

    /**
     * The stylesheet to compile, honouring a platform file beside the configured entry.
     *
     * `global.web.css` overrules `global.css` on web, `global.native.css` does on both native
     * platforms, and so on. The configured entry stays the fallback and the identity of the
     * module Metro transforms, so nothing else in the pipeline needs to know.
     */
    get cssPath() {
        const entryPath = path.join(process.cwd(), this.config.cssEntryFile)
        const extension = path.extname(entryPath)
        const stem = entryPath.slice(0, entryPath.length - extension.length)

        for (const suffix of CSS_ENTRY_PLATFORM_FALLBACKS[this.platform] ?? []) {
            const platformEntryPath = `${stem}.${suffix}${extension}`

            if (fs.existsSync(platformEntryPath)) {
                return platformEntryPath
            }
        }

        return entryPath
    }

    get themes() {
        return Array.from(
            new Set([
                'light',
                'dark',
                ...this.config.extraThemes ?? [],
            ]),
        )
    }

    get cssVisitor() {
        return new UniwindCSSVisitor(this)
    }

    get polyfills() {
        return this.config.polyfills
    }

    get stringifiedThemes() {
        return `[${this.themes.map((theme) => `'${theme}'`).join(', ')}]`
    }

    toMetroConfig(isExpoProject: boolean): UniwindMetroConfig {
        return {
            ...this.config,
            isExpoProject,
        }
    }

    async generateArtifacts(cssArtifactPath: string) {
        await buildCSS(this.themes, this.config.cssEntryFile, cssArtifactPath)
        buildDtsFile(this.config.dtsFile ?? 'uniwind-types.d.ts', this.stringifiedThemes)
    }
}
