import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        permissions: ['tabs', 'activeTab', 'downloads', 'scripting', '<all_urls>'],
    },
});
