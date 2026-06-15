'use strict';

let contentLoaded = function() {
    let muraToolbar = document.getElementById('frontEndTools');
    if (muraToolbar == null)
        return;
    muraToolbar.addEventListener('mouseover', (e) => removeHighlight(), false);
    let muraBody = document.querySelector('.mura-body');
    if (muraBody == null)
        muraBody = document.querySelector('#mura-editable-attribute-body');
    if (muraBody == null) {
        console.log("axe: no result for this page (no element with the mura-body class)");
        return;
    }
    let context = getAxeContext(muraBody);
    let options = configureAxe();
    options.restoreScroll = true;
    let top = window.scrollY; // restoreScroll is not working well, this will save scroll position
    axe.run(context, options).then(
        (results) => {
            window.scrollTo(window.scrollX, top);
            let violations = results.violations;
            displayBadge(violations);
        },
        (error) => {
            console.log(error);
        }
    );
}

let displayBadge = function(violations) {
    let nbViolations = 0;
    if (violations.length > 0) {
        for (let violation of violations)
            nbViolations += violation.nodes.length;
    }
    let div = document.createElement('div');
    div.classList.add('accessibility-badge');
    if (nbViolations == 0) {
        div.classList.add('accessibility-badge-good');
        let span = document.createElement('span');
        span.classList.add('fa');
        span.classList.add('fa-check');
        span.appendChild(document.createTextNode('\u00A0')); // nbsp
        span.title = "No accessibility violation";
        div.appendChild(span);
    } else {
        div.classList.add('accessibility-badge-bad');
        if (nbViolations >= 10)
            div.style.fontSize = '25px';
        div.appendChild(document.createTextNode(''+nbViolations));
        div.title = nbViolations + " accessibility violations";
        div.addEventListener('click', (e) => {
            let div = document.querySelector('.accessibility-popup');
            if (div == null)
                displayViolations(violations);
            else {
                removeHighlight();
                div.parentNode.removeChild(div);
            }
        }, false);
    }
    document.body.appendChild(div);
}

let displayViolations = function(violations) {
    let div = document.createElement('div');
    div.classList.add('accessibility-popup');
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
    div.appendChild(vList);
    document.body.appendChild(div);
}

let addNodes = function(vLi, nodes) {
    let nodeList = document.createElement('ul');
    for (let node of nodes) {
        let nodeLi = document.createElement('li');
        let htmlLink = document.createElement('a');
        htmlLink.href = '#';
        htmlLink.classList.add('accessibility-node-link');
        let htmlText = node.html;
        if (htmlText.length > 75)
            htmlText = htmlText.substring(0, 75) + "...";
        htmlLink.appendChild(document.createTextNode(htmlText));
        nodeLi.appendChild(htmlLink);
        nodeList.appendChild(nodeLi);
        htmlLink.addEventListener('click', (e) => {
            e.preventDefault();
            let el = getNodeElement(node);
            if (el == null)
                return;
            removeHighlight();
            el.scrollIntoView({ block: 'center', inline: 'nearest' });
            document.documentElement.scrollTop -= 32; // for the Mura menubar
            highlightElement(el);
        }, false);
    }
    vLi.appendChild(nodeList);
}

let getNodeElement = function(node) {
    if (node.element != null)
        return node.element;
    if (node.target == null || !Array.isArray(node.target) || node.target.length == 0)
        return null;
    for (let selector of node.target) {
        try {
            let el = document.querySelector(selector);
            if (el != null)
                return el;
        } catch (error) {
            // Ignore invalid selectors and keep trying.
        }
    }
    return null;
}

let removeHighlight = function() {
    let highlightedElement = document.querySelector('.accessibility-highlight');
    if (highlightedElement != null)
        highlightedElement.classList.remove('accessibility-highlight');

    let overlay = document.querySelector('.accessibility-highlight-overlay');
    if (overlay != null)
        overlay.parentNode.removeChild(overlay);
}

let highlightElement = function(el) {
    // Keep the class highlight for simple cases and legacy behavior.
    el.classList.add('accessibility-highlight');

    let rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0)
        return;

    let overlay = document.createElement('div');
    overlay.classList.add('accessibility-highlight-overlay');
    overlay.style.top = (window.scrollY + rect.top - 4) + 'px';
    overlay.style.left = (window.scrollX + rect.left - 4) + 'px';
    overlay.style.width = (rect.width + 8) + 'px';
    overlay.style.height = (rect.height + 8) + 'px';
    document.body.appendChild(overlay);
}

document.addEventListener('DOMContentLoaded', contentLoaded);
