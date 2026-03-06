import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'HELIX',
    description: 'Genome Protocol on OPNet — Bitcoin L1 yield wrapping',
    appearance: false,
    head: [['link', { rel: 'icon', type: 'image/png', href: '/helixIcon.png' }]],

    themeConfig: {
        siteTitle: 'HELIX',

        nav: [
            { text: 'Explore App', link: 'https://app.helixbtc.io' },
            { text: 'helixbtc.io', link: 'https://helixbtc.io' },
        ],

        sidebar: [
            {
                text: 'Concepts',
                items: [
                    { text: 'What is Helix', link: '/concepts/what-is-helix' },
                    { text: 'What is a Genome', link: '/concepts/what-is-a-genome' },
                    { text: 'The Ratio Mechanism', link: '/concepts/ratio-mechanism' },
                    { text: 'How Yield Works', link: '/concepts/yield' },
                    { text: 'Fees', link: '/concepts/fees' },
                ],
            },
            {
                text: 'User Guides',
                items: [
                    { text: 'Prerequisites', link: '/guides/prerequisites' },
                    { text: 'Connecting Your Wallet', link: '/guides/connecting-wallet' },
                    { text: 'Exploring Genomes', link: '/guides/explore' },
                    { text: 'Wrapping Tokens', link: '/guides/wrap' },
                    { text: 'Unwrapping Tokens', link: '/guides/unwrap' },
                ],
            },
            {
                text: 'Creator Guide',
                items: [
                    { text: 'Overview', link: '/creator/overview' },
                    { text: 'Creating a Genome', link: '/creator/create-genome' },
                    { text: 'Adding Liquidity', link: '/creator/add-liquidity' },
                    { text: 'Setting Fees', link: '/creator/set-fees' },
                    { text: 'Injecting Rewards', link: '/creator/inject-rewards' },
                ],
            },
            {
                text: 'Reference',
                items: [
                    { text: 'Genome Contract', link: '/reference/genome-contract' },
                    { text: 'Factory Contract', link: '/reference/factory-contract' },
                    { text: 'FAQ', link: '/reference/faq' },
                ],
            },
        ],

        socialLinks: [],
    },
})
