'use strict';

let currentURL, currentScanMode, nbDocs, nbViolations, stopRequested, startButton, stopButton;
let requestTimeout = 10000; // ms
let renderedScanSettleDelay = 750; // ms
let renderedScanMaxWait = 8000; // ms

let init = function() {
    startButton = document.getElementById('startChecking');
    startButton.addEventListener('click', (e) => {
        // Apply the selected rule set before each scan
        let ruleSetSelect = document.getElementById('ruleSetSelect');
        if (ruleSetSelect && window.axeRuleTagSets) {
            axeRuleTags = window.axeRuleTagSets[ruleSetSelect.value] || axeRuleTags;
        }
        let scanModeSelect = document.getElementById('scanModeSelect');
        currentScanMode = scanModeSelect == null ? 'static' : scanModeSelect.value;
        startChecking();
    }, false);

    stopButton = document.getElementById('stopChecking');
    stopButton.disabled = true;
    stopButton.addEventListener('click', (e) => stopChecking(), false);
}

let createIframe = function() {
    // there are issues in Chrome when reusing the same iframe, so it is recreated every time
    // EDIT: actually, it looks like crashes only happen with dev tools open,
    // and it still happens when changing iframes,
    // so maybe this is not needed...
    // (but there was an issue with let in accessibility_iframe.js if it was not in a block)
    let iframeContainer = document.getElementById('testIframeContainer');
    if (iframeContainer == null) {
        iframeContainer = document.createElement('div');
        iframeContainer.id = 'testIframeContainer';
        document.body.appendChild(iframeContainer);
    }
    let iframe = document.getElementById('testIframe');
    if (iframe != null)
        iframe.parentNode.removeChild(iframe);
    iframe = document.createElement('iframe');
    iframe.id = 'testIframe';
    iframe.width = 1000;
    iframe.height = 600;
    //iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    iframeContainer.appendChild(iframe);
}

let startChecking = function() {
    startButton.disabled = true;
    stopRequested = false;
    stopButton.disabled = false;
    let violationList = document.getElementById('violationList');
    violationList.innerHTML = '';
    nbDocs = 0;
    let nbDocsSpan = document.getElementById('nbDocs');
    nbDocsSpan.innerHTML = '' + nbDocs + ' / ' + urls.length;
    nbViolations = 0;
    let nbViolationsSpan = document.getElementById('nbViolations');
    nbViolationsSpan.innerHTML = '' + nbViolations;
    firstURL();
}

let stopChecking = function() {
    stopRequested = true;
    stopButton.disabled = true;
}

let endChecking = function() {
    startButton.disabled = false;
    stopButton.disabled = true;
    let urlSpan = document.getElementById('testURL');
    urlSpan.innerHTML = '';
}

let contentLoaded = function(content) {
    let iframe = document.getElementById('testIframe');
    content = filterContent(content);
    // make these 2 functions available globally so they can be called by the iframe
    window.addViolationsAndContinue = addViolationsAndContinue;
    window.outputErrorMessageAndContinue = outputErrorMessageAndContinue;
    // and also the currentURL variable
    window.accessibilityCurrentURL = currentURL;
    // see https://stackoverflow.com/questions/10418644/creating-an-iframe-with-given-html-dynamically
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(content);
    iframe.contentWindow.document.close();
    // accessibility_iframe.js will use DOMContentLoaded to continue
}

let getRenderedURL = function(url) {
    let absoluteURL = new URL(url, location.protocol + '//' + location.host);
    absoluteURL.searchParams.set('accessibilityRenderedScan', '1');
    return absoluteURL.toString();
}

let outputErrorMessageAndContinue = function(message) {
    let ul = document.getElementById('violationList');
    let docLi = document.createElement('li');
    docLi.innerHTML = message;
    ul.appendChild(docLi);
    if (!stopRequested)
        nextURL();
    else
        endChecking();
}

let startURL = function(url) {
    createIframe();
    currentURL = url;
    let urlSpan = document.getElementById('testURL');
    urlSpan.innerHTML = url;
    if (currentScanMode == 'rendered') {
        startRenderedURL(url);
        return;
    }
    getContentFromURL(location.protocol + "//" + location.host + url).then(
        (content) => contentLoaded(content),
        (errMessage) => outputErrorMessageAndContinue(
            'Error loading <a href="' + url + '" target="_blank">' + url +
            '</a>: ' + errMessage));
}

let startRenderedURL = function(url) {
    let iframe = document.getElementById('testIframe');
    let renderedURL = getRenderedURL(url);
    let onLoad = function() {
        iframe.removeEventListener('load', onLoad, false);
        runRenderedScan(iframe, url);
    };
    iframe.addEventListener('load', onLoad, false);
    iframe.src = renderedURL;
}

let firstURL = function() {
    startURL(urls[0]);
}

let nextURL = function() {
    let index = urls.indexOf(currentURL);
    if (index != -1 && index < urls.length - 1) {
        startURL(urls[index + 1]);
    } else {
        endChecking();
        let urlSpan = document.getElementById('testURL');
        urlSpan.innerHTML = "Done";
    }
}

let addViolationsAndContinue = function(violations) {
    let url = currentURL;
    let top = window.scrollY;
    nbDocs++;
    let nbDocsSpan = document.getElementById('nbDocs');
    nbDocsSpan.innerHTML = '' + nbDocs + ' / ' + urls.length;
    if (violations.length > 0) {
        nbViolations += violations.length;
        let nbViolationsSpan = document.getElementById('nbViolations');
        nbViolationsSpan.innerHTML = '' + nbViolations;
        let ul = document.getElementById('violationList');
        let docLi = document.createElement('li');
        let urlLink = document.createElement('a');
        urlLink.href = url;
        urlLink.target = '_blank';
        urlLink.appendChild(document.createTextNode(url));
        docLi.appendChild(urlLink);
        let vList = document.createElement('ul');
        for (let violation of violations) {
            fixViolationStrings(violation);
            let vLi = document.createElement('li');
            let descLink = document.createElement('a');
            descLink.href = violation.helpUrl;
            descLink.target = '_blank';
            descLink.appendChild(document.createTextNode(violation.description));
            vLi.appendChild(descLink);
            addNodes(vLi, violation.nodes);
            vList.appendChild(vLi);
        }
        docLi.appendChild(vList);
        ul.appendChild(docLi);
    }
    window.scrollTo(window.scrollX, top);
    if (!stopRequested)
        nextURL();
    else
        endChecking();
}

let addNodes = function(vLi, nodes) {
    let nodeList = document.createElement('ul');
    for (let node of nodes) {
        let nodeLi = document.createElement('li');
        let target = node.target[0];
        let usualTargetStart = 'html > body > .secondaryPageWrapper > .container.secondaryPageContainer > .row > [role="main"] > ';
        if (target.indexOf(usualTargetStart) == 0)
            target = target.substring(usualTargetStart.length);
        let anotherTarget = 'html > body > .secondaryPageWrapper > div > .contentRow.contentRow-articlePage > [role="main"] > ';
        if (target.indexOf(anotherTarget) == 0)
            target = target.substring(anotherTarget.length);
        let targetSpan = document.createElement('span');
        targetSpan.title = node.html;
        targetSpan.appendChild(document.createTextNode(target));
        nodeLi.appendChild(targetSpan);
        nodeList.appendChild(nodeLi);
    }
    vLi.appendChild(nodeList);
}

let runRenderedScan = async function(iframe, url) {
    try {
        let doc = iframe.contentWindow.document;
        let win = iframe.contentWindow;
        let context = getScanContext(doc);
        if (context == null) {
            outputErrorMessageAndContinue(
                'Warning: no result for <a href="' + url + '" target="_blank">' + url +
                '</a> (no element with the mura-body class)');
            return;
        }
        await waitForRenderedPageToSettle(win);
        await scrollRenderedPage(win);
        await waitForRenderedPageToSettle(win);
        if (typeof win.configureAxe != 'function' || win.axe == null) {
            outputErrorMessageAndContinue(
                'Error loading <a href="' + url + '" target="_blank">' + url +
                '</a>: axe is not available in rendered mode');
            return;
        }
        context = win.getAxeContext(context);
        let options = win.configureAxe();
        let results = await win.axe.run(context, options);
        addViolationsAndContinue(results.violations);
    } catch (error) {
        outputErrorMessageAndContinue(
            'Error loading <a href="' + url + '" target="_blank">' + url +
            '</a>: ' + error);
    }
}

let getScanContext = function(doc) {
    let muraBody = doc.querySelector('.mura-body');
    if (muraBody == null)
        muraBody = doc.querySelector('#mura-editable-attribute-body');
    return muraBody;
}

let waitForRenderedPageToSettle = function(win) {
    return new Promise((resolve) => {
        let resolved = false;
        let lastMutationAt = Date.now();
        let doc = win.document;
        let observer = new MutationObserver(() => {
            lastMutationAt = Date.now();
        });
        let cleanup = function() {
            if (resolved)
                return;
            resolved = true;
            observer.disconnect();
            win.clearInterval(intervalID);
            win.clearTimeout(timeoutID);
            resolve();
        };
        observer.observe(doc.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
        let intervalID = win.setInterval(() => {
            if (Date.now() - lastMutationAt >= renderedScanSettleDelay)
                cleanup();
        }, 100);
        let timeoutID = win.setTimeout(cleanup, renderedScanMaxWait);
    });
}

let scrollRenderedPage = function(win) {
    return new Promise((resolve) => {
        let doc = win.document.documentElement;
        let maxScroll = Math.max(
            doc.scrollHeight,
            win.document.body == null ? 0 : win.document.body.scrollHeight
        ) - win.innerHeight;
        if (maxScroll <= 0) {
            resolve();
            return;
        }
        let position = 0;
        let step = Math.max(200, Math.floor(win.innerHeight * 0.75));
        let advance = function() {
            if (stopRequested) {
                resolve();
                return;
            }
            win.scrollTo(0, position);
            position += step;
            if (position <= maxScroll) {
                win.setTimeout(advance, 150);
            } else {
                win.scrollTo(0, 0);
                win.setTimeout(resolve, 150);
            }
        };
        advance();
    });
}

let getContentFromURL = function(url) {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.timeout = requestTimeout;
        req.open('GET', url);
        req.onload = (e) => {
            if (req.status === 200) {
                resolve(req.response);
            } else {
                reject(req.statusText);
            }
        };
        req.onerror = (e) => {
            reject("Network error: " + req.statusText);
        };
        req.ontimeout = (e) => {
            reject("Reached " + (requestTimeout/1000) + "s timeout");
        };
        req.send();
    });
}

let filterContent = function(html) {
    // remove all scripts
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    // prevent image loading by removing the src attribute
    html = html.replace(/(<img[^>]*?)src\s?=\s?"[^"]*"/gi, '$1');
    // remove accessibility_in_page.css
    html = html.replace(/<link rel="stylesheet" href=".*accessibility_in_page.css">/,
        '');
    // add the scripts to test the page
    // we can't use defer here, otherwise browsers will not wait for the CSS to be loaded
    // before DOMContentLoaded, and color contrast checks will fail
    // (another option would be to use load instead of DOMContentLoaded in accessibility_iframe.js)
    let injectedScripts = `
<script src="assets/js/axe.min.js"></script>
<script src="assets/js/accessibility_common.js"></script>
<script src="assets/js/accessibility_iframe.js"></script>
    `;
    if (html.includes('</head>'))
        html = html.replace('</head>', injectedScripts + '</head>');
    else
        html = '<head>' + injectedScripts + '</head>' + html;
    return html;
}

init();
