/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

'use strict';

(function () {
    class AdnRevitLinkOptionsPanel extends Autodesk.Viewing.UI.DockingPanel {
        constructor(parent, title, options) {
            options = options || {};

            //  Height adjustment for scroll container, offset to height of the title bar and footer by default.
            if (!options.heightAdjustment)
                options.heightAdjustment = 70;

            if (!options.marginTop)
                options.marginTop = 0;

            let viewer = parent.viewer;
            super(viewer.container, viewer.container.id + 'AdnRevitLinkOptionsPanel', title, options);

            this.container.classList.add('adn-docking-panel');
            this.container.classList.add('adn-rvt-link-options-panel');
            this.createScrollContainer(options);

            this.parent = parent;
            this.options = options;
            this.uiCreated = false;

            this.addVisibilityListener((show) => {
                if (!show) return;

                if (!this.uiCreated)
                    this.createUI();
            });
        }

        get viewer() {
            return this.parent.viewer;
        }

        createUI() {
            if (this.uiCreated) return;

            this.uiCreated = true;
            const div = document.createElement('div');

            const treeDiv = document.createElement('div');
            div.appendChild(treeDiv);
            this.treeContainer = treeDiv;
            this.scrollContainer.appendChild(div);
        }
    }

    class AdnRevitAggregationHelperExtension extends Autodesk.Viewing.Extension {
        constructor(viewer, options) {
            super(viewer, options);

            this.panel = null;
            this.modelAggregationTool = null;
            this.modelData = null;
            this.loadModelMultiple = this.loadModelMultiple.bind(this);
            this.createUI = this.createUI.bind(this);
            this.onToolbarCreated = this.onToolbarCreated.bind(this);
        }

        onToolbarCreated() {
            this.createUI();
        }

        createUI() {
            const viewer = this.viewer;

            const rvtLinkOptsPanel = new AdnRevitLinkOptionsPanel(this, 'Revit Aggregation Options');
            viewer.addPanel(rvtLinkOptsPanel);
            this.panel = rvtLinkOptsPanel;

            const rvtLinkOptsButton = new Autodesk.Viewing.UI.Button('toolbar-adnRevitLinkOptsTool');
            rvtLinkOptsButton.setToolTip('Revit Aggregation Options');
            rvtLinkOptsButton.setIcon('adsk-icon-documentModels');
            rvtLinkOptsButton.onClick = function () {
                rvtLinkOptsPanel.setVisible(!rvtLinkOptsPanel.isVisible());
            };

            const subToolbar = new Autodesk.Viewing.UI.ControlGroup('toolbar-adn-tools');
            subToolbar.addControl(rvtLinkOptsButton);
            subToolbar.adnRvtLinkOptsButton = rvtLinkOptsButton;
            this.subToolbar = subToolbar;

            viewer.toolbar.addControl(this.subToolbar);

            rvtLinkOptsPanel.addVisibilityListener(function (visible) {
                if (visible)
                    viewer.onPanelVisible(rvtLinkOptsPanel, viewer);

                rvtLinkOptsButton.setState(visible ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            });
        }

        async initializeModelTool() {
            if (this.modelAggregationTool)
                this.deinitializeModelTool();

            await Autodesk.Viewing.Private.theResourceLoader.loadScript(
                'http://cdn.jsdelivr.net/gh/yiskang/MultipleModelUtil/MultipleModelUtil.js',
                'MultipleModelUtil'
            );

            const tool = new MultipleModelUtil(this.viewer);
            tool.options = {
                alignment: MultipleModelAlignmentType.CenterToCenter
            };
            this.modelAggregationTool = tool;
        }

        async deinitializeModelTool() {
            if (!this.modelAggregationTool) return;

            delete this.modelAggregationTool;
            this.modelAggregationTool = null;
        }

        async ensureLibrariesDownloaded() {
            await this.initializeModelTool();

            if (!(this.viewer.loadModelMultiple instanceof Function))
                this.viewer.loadModelMultiple = this.loadModelMultiple;
        }

        clearModelData() {
            if (!this.modelData) return;

            if (this.viewer.impl.hasModels()) {
                const _conf = this.viewer.options;
                this.viewer.tearDown();
                this.viewer.setUp(_conf);
            }

            while (this.modelData.length > 0) {
                this.modelData.pop();
            }

            delete this.modelData;
            this.modelData = null;
        }

        loadModelMultiple(modelData) {
            this.clearModelData();

            this.modelData = modelData;
            this.modelAggregationTool.processModels(modelData);
        }

        load() {
            if (this.viewer.toolbar) {
                // Toolbar is already available, create the UI
                this.createUI();
            }

            this.ensureLibrariesDownloaded();

            return true;
        }

        unload() {
            if (this.panel) {
                this.panel.uninitialize();
                delete this.panel;
                this.panel = null;
            }

            if (this.subToolbar) {
                this.viewer.toolbar.removeControl(this.subToolbar);
                delete this.subToolbar;
                this.subToolbar = null;
            }

            this.clearModelData();
            delete this.viewer.loadModelMultiple;
            this.deinitializeModelTool();

            return true;
        }
    }

    Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.ADN.RevitAggregationHelper', AdnRevitAggregationHelperExtension);
})();