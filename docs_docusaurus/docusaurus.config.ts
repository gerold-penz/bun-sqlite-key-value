import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: 'Bun-SQLite-Key-Value',
    tagline: 'Dinosaurs are cool',
    favicon: 'img/favicon.ico',

    // Scripts im Head-Bereich der HTML-Seite
    scripts: [
        {
            src: "https://umami.gp-softwaretechnik.at/script.js",
            defer: true,
            "data-website-id": "997dec81-b347-4af0-b4dc-8371a6c60077",
            "data-tag": "bun-sqlite-key-value"
        }
    ],

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "https://gerold-penz.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/bun-sqlite-key-value/",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'gerold-penz', // Usually your GitHub org/user name.
    projectName: 'bun-sqlite-key-value', // Usually your repo name.

    onBrokenLinks: 'log',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    routeBasePath: "/"
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        // Replace with your project's social card
        image: 'img/docusaurus-social-card.jpg',
        navbar: {
            title: "Bun-SQLite-Key-Value",
            // logo: {
            //     alt: 'My Site Logo',
            //     src: 'img/logo.svg',
            // },
            items: [
                // {
                //     type: 'docSidebar',
                //     sidebarId: 'tutorialSidebar',
                //     position: 'left',
                //     label: 'Documentation',
                // },
                // {
                //     to: '/blog',
                //     label: 'Blog',
                //     position: 'left'
                // },
                {
                    href: "https://github.com/gerold-penz/bun-sqlite-key-value",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    items: [
                        {
                            label: "Bun",
                            href: "https://bun.sh/",
                        },
                        {
                            label: "Bun:SQLite",
                            href: "https://bun.sh/docs/api/sqlite",
                        },
                    ],
                },
                {
                    items: [
                        {
                            label: "SQLite",
                            href: "https://sqlite.org/"
                        }
                    ],
                },
                {
                    items: [
                        {
                            label: "GitHub",
                            href: "https://github.com/gerold-penz/bun-sqlite-key-value",
                        },
                        {
                            label: "NPM",
                            href: "https://www.npmjs.com/package/bun-sqlite-key-value",
                        },
                    ],
                },
            ],
            copyright: `
                Bun-SQLite-Key-Value - by Gerold Penz
                - <a href="https://gp-softwaretechnik.at/" target="_blank">GP-Softwaretechnik</a> - 
                ${new Date().getFullYear()} - have fun
            `,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
}

export default config
