
<cfscript>
    include 'plugin/config.cfm';
    
    urls = [];
    feedBean = $.getFeed('content')
        .where()
        .prop('type').isEQ('Page')
        .orProp('type').isEQ('Folder');
    feedBean.setIncludeHomePage(1);
    feedBean.setShowNavOnly(0);
    feedBean.setShowExcludeSearch(1);
    feedBean.setMaxItems(0); // get all records
    feedBean.setItemsPerPage(0);
    iterator = feedBean.getIterator();
    while (iterator.hasNext()) {
        item = iterator.next();
        itemURL = item.getUrl();
        if (urls.find(itemURL) == 0)
            urls.append(itemURL);
    }
</cfscript>

<cfsavecontent variable="head"><cfoutput>
    <link href="assets/css/accessibility.css" rel="stylesheet">
    <script>
        var urls = [
            <cfloop index="i" from="1" to="#urls.len()#">
                '#encodeForJavaScript(urls[i])#'<cfif i neq urls.len()>,</cfif>
            </cfloop>
        ];
        // axeRuleTags is set by the rule-set selector below at runtime.
        // accessibility_common.js reads window.axeRuleTags; default is WCAG 2.1 AA.
        var axeRuleTagSets = {
            'wcag2a': ['wcag2a'],
            'wcag21aa': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
            'wcag2aa':  ['wcag2a', 'wcag2aa'],
            'wcag21a': ['wcag2a', 'wcag21a'],
            'wcag22aa': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
            'wcag2aaa': ['wcag2a', 'wcag2aa', 'wcag2aaa'],
            'best-practice': ['best-practice'],
            'ACT': ['ACT'],
            'section508': ['section508'],
            'all-tags': ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'ACT', 'section508']
        };
    </script>
    <script src="assets/js/axe.min.js" defer></script>
    <script src="assets/js/accessibility_common.js" defer></script>
    <script src="assets/js/accessibility.js" defer></script>
</cfoutput></cfsavecontent>
<cfhtmlhead text='#head#'>

<cfsavecontent variable="body"><cfoutput>
    <div class="mura-header">
        <h1>#HTMLEditFormat(pluginConfig.getName())#</h1>
    </div>
    <div class="block block-bordered">
        <div class="block-content">
            <cfif $.siteConfig('domain') neq cgi.server_name>
                <p>Warning: this plugin only works when the selected site has the same domain as the one in this page URL.</p>
            </cfif>
            <p>
                <label for="ruleSetSelect"><strong>Accessibility Standard:</strong></label>
                <select id="ruleSetSelect">
                    <option value="wcag21aa" selected>WCAG 2.1 AA (default)</option>
                    <option value="wcag2a">WCAG 2.0 A</option>
                    <option value="wcag2aa">WCAG 2.0 AA</option>
                    <option value="wcag21a">WCAG 2.1 A</option>
                    <option value="wcag22aa">WCAG 2.2 AA</option>
                    <option value="wcag2aaa">WCAG 2.0 AAA</option>
                    <option value="best-practice">Best Practices</option>
                    <option value="ACT">ACT</option>
                    <option value="section508">Section 508</option>
                    <option value="all-tags">All Available Tags</option>
                </select>
            </p>
            <p>
                <label for="scanModeSelect"><strong>Scan Mode:</strong></label>
                <select id="scanModeSelect">
                    <option value="static">Static HTML (current behavior)</option>
                    <option value="rendered" selected>Rendered page (load scripts and lazy content)</option>
                </select>
            </p>
            <p>
                <button id="startChecking">Start checking the site</button>
                <button id="stopChecking">Stop</button>
            </p>
            <p><strong>Number of documents checked:</strong> <span id="nbDocs">0 / #urls.len()#</span></p>
            <p><strong>Total number of violations:</strong> <span id="nbViolations">0</span></p>
            <p><strong>Testing URL:</strong> <span id="testURL"></span></p>
            <p><strong>Violations:</strong></p>
            <ul id="violationList"></ul>
        </div>
    </div>
</cfoutput></cfsavecontent>
<cfoutput>
    #$.getBean('pluginManager').renderAdminTemplate(body=body, pagetitle=pluginConfig.getName())#
</cfoutput>
