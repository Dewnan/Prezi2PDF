document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('startBtn');
    const clearBtn = document.getElementById('clearBtn');

    startBtn.addEventListener('click', async () => {
        const count = parseInt(document.getElementById('slideCount').value);
        const delay = parseInt(document.getElementById('delay').value) || 1500;
        if (!count || count < 1) {
            statusEl.textContent = 'Enter a valid slide count.';
            return;
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        statusEl.textContent = `Capturing ${count} slides...`;
        startBtn.disabled = true;

        try {
            await browser.tabs.sendMessage(tab.id, { action: 'start', count, delay });
        } catch (e) {
            // Content script not yet injected — inject it now and retry
            try {
                await browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-scripts/content.js'],
                });
                await browser.tabs.sendMessage(tab.id, { action: 'start', count, delay });
            } catch (e2) {
                statusEl.textContent = `Error: Could not connect to page. Make sure you are on a Prezi presentation page.`;
                startBtn.disabled = false;
                return;
            }
        }

        browser.runtime.onMessage.addListener(function listener(msg) {
            if (msg.action === 'pdfDone') {
                statusEl.textContent = 'PDF downloaded successfully!';
                startBtn.disabled = false;
                browser.runtime.onMessage.removeListener(listener);
            }
            if (msg.action === 'pdfError') {
                statusEl.textContent = `Error: ${msg.error}`;
                startBtn.disabled = false;
                browser.runtime.onMessage.removeListener(listener);
            }
        });
    });

    clearBtn.addEventListener('click', async () => {
        await browser.runtime.sendMessage({ action: 'clear' });
        statusEl.textContent = 'Ready.';
        startBtn.disabled = false;
    });
});