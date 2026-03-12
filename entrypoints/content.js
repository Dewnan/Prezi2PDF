export default defineContentScript({
    matches: ['<all_urls>'],
    main() {

let isCapturing = false;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getNextButton() {
    return document.querySelector('.webgl-viewer-navbar-button-next');
}

function dismissOverlays() {
    const acceptBtn = document.querySelector('[id*="accept"], [class*="cookie"] button');
    if (acceptBtn) acceptBtn.click();
}

function fakeFullscreen() {
    const viewer = document.querySelector('canvas') || document.querySelector('.webgl-viewer');
    if (!viewer) return;
    viewer.style.position = 'fixed';
    viewer.style.top = '0';
    viewer.style.left = '0';
    viewer.style.width = '100vw';
    viewer.style.height = '100vh';
    viewer.style.zIndex = '99999';
}

function exitFakeFullscreen() {
    const viewer = document.querySelector('canvas') || document.querySelector('.webgl-viewer');
    if (!viewer) return;
    viewer.style.position = '';
    viewer.style.top = '';
    viewer.style.left = '';
    viewer.style.width = '';
    viewer.style.height = '';
    viewer.style.zIndex = '';
}

async function captureAllFrames(slideCount, delay) {
    if (isCapturing) return;
    isCapturing = true;
    dismissOverlays();
    fakeFullscreen();

    for (let i = 0; i < slideCount; i++) {
        const nextBtn = getNextButton();
        if (!nextBtn) break;

        nextBtn.click();
        await sleep(delay);
        await browser.runtime.sendMessage({ type: 'capture' });
        await sleep(200);
    }

    exitFakeFullscreen();
    isCapturing = false;
    await browser.runtime.sendMessage({ action: "done", frameCount: slideCount });
}

browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "start") {
        captureAllFrames(msg.count, msg.delay || 1500);
    }
});

    }
});