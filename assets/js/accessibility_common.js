'use strict';

// ---------------------------------------------------------------------------
// Axe-core rule tag configuration
//
// Override window.axeRuleTags before this script runs to change which rules
// are applied.  Any combination of axe-core 4.x tags is accepted.
//
// Available tags (axe-core 4.x):
//   wcag2a       – WCAG 2.0 Level A
//   wcag2aa      – WCAG 2.0 Level AA
//   wcag2aaa     – WCAG 2.0 Level AAA
//   wcag21a      – WCAG 2.1 Level A  (rules added in 2.1)
//   wcag21aa     – WCAG 2.1 Level AA (rules added in 2.1)
//   wcag22aa     – WCAG 2.2 Level AA (rules added in 2.2)
//   best-practice – axe best-practice rules (not part of any WCAG level)
//   ACT          – W3C ACT rules
//   section508   – Section 508
//
// Default: WCAG 2.1 AA (covers all WCAG 2.0 A/AA rules plus 2.1 additions)
// ---------------------------------------------------------------------------
var axeRuleTags = window.axeRuleTags || ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
var axeExcludeSelectors = ['#mura-sidebar-container', '.mura-toolbar'];

function getAxeContext(rootElement) {
    return {
        include: [rootElement],
        exclude: axeExcludeSelectors
    };
}

function configureAxe() {
    // A custom check and rule are added to check for empty alt attributes.
    // Normally, empty alt attributes are meant for purely decorative purposes.
    // Since aXe is not reporting possible false positives, it does not consider this a violation.
    // Unfortunately, CKEditor saves an empty alt attribute when a user inserts an image
    // without specifying anything for alt, instead of not saving an alt attribute at all.
    // This custom rule will report a violation if an empty alt attribute is used for an
    // image with a width larger than 30 px, unless a role is specified with the "presentation"
    // or "none" value.
    // Aside from that, rules are determined by axeRuleTags (default: WCAG 2.1 AA).
    let checks = [
        {
            id: 'custom-alt-probably-ok',
            evaluate: function(node) {
                if (node.nodeName != 'IMG')
                    return true;
                let alt = node.getAttribute('alt');
                if (alt == null || alt != '')
                    return true; // another rule will catch alt == null
                let role = node.getAttribute('role');
                if (role == 'presentation' || role == 'none')
                    return true;
                let width = node.getAttribute('width');
                if (width != null) {
                    width = parseInt(width);
                    if (!isNaN(width) && width < 30)
                        return true; // this could really be for decorative purpose
                }
                return false;
            }
        }
    ];
    let rules = [{
        id: 'custom-check-img-alt-ok',
        selector: 'img',
        all: ['custom-alt-probably-ok'],
        tags: ['img']
    }];
    axe.configure({
        branding: {
            application: "Mura Accessibility Plugin"
        },
        checks: checks,
        rules: rules
    });
    let options = {
        runOnly: axeRuleTags,
        rules: {
            'custom-check-img-alt-ok': { enabled: true }
        },
        elementRef: true
    };
    return options;
}

function fixViolationStrings(violation) {
    if (violation.id == 'custom-check-img-alt-ok') {
        violation.description = 'Images must have alternate text';
        violation.help = 'Ensures <img> elements have alternate text or a role of none or presentation';
        violation.helpUrl = 'https://dequeuniversity.com/rules/axe/4.x/image-alt?application=axeAPI';
    }
}
