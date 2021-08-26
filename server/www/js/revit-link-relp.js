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
    class AdnRevitLinkRelpPanel extends Autodesk.Viewing.UI.DockingPanel {
        constructor(viewer, title, options) {
            options = options || {};

            //  Height adjustment for scroll container, offset to height of the title bar and footer by default.
            if (!options.heightAdjustment)
                options.heightAdjustment = 70;

            if (!options.marginTop)
                options.marginTop = 0;

            super(viewer.container, viewer.container.id + 'AdnRevitLinkRelpPanel', title, options);

            this.container.classList.add('adn-docking-panel');
            this.container.classList.add('adn-rvt-link-relp-panel');
            this.createScrollContainer(options);

            this.viewer = viewer;
            this.options = options;
            this.uiCreated = false;
            this.modelExternalIdMaps = {};

            this.addVisibilityListener((show) => {
                if (!show) return;

                if (!this.uiCreated)
                    this.createUI();
            });
        }

        async buildExternalIdMaps() {
            try {
                const getExternalIdMapping = (model) => {
                    return new Promise((resolve, reject) => {
                        model.getExternalIdMapping(
                            map => resolve(map),
                            error => reject(new Error(error))
                        )
                    });
                };

                const models = this.viewer.getAllModels();
                for (let i = 0; i < models.length; i++) {
                    const model = models[i];
                    const extIdMap = await getExternalIdMapping(model);
                    const modelKey = model.getModelKey();
                    this.modelExternalIdMaps[modelKey] = extIdMap;
                }
            } catch (ex) {
                console.error(`[AdnRevitLinkRelpPanel]: ${ex}`);
                return false;
            }

            return true;
        }

        async getPropertiesAsync(dbId, model) {
            return new Promise((resolve, reject) => {
                model.getProperties2(
                    dbId,
                    (result) => resolve(result),
                    (error) => reject(error)
                );
            });
        };

        async getRevitLinkName(rvtLinkInstId, model) {
            try {
                const modelKey = model.getModelKey();
                const rvtLinkInstDbId = this.modelExternalIdMaps[modelKey][rvtLinkInstId];
                const propResult = await this.getPropertiesAsync(rvtLinkInstDbId, model);

                const linkNameProp = propResult.properties.find(prop => prop.displayName == 'Type Name' || prop.attributeName == 'Type Name');
                return linkNameProp.displayValue;
            } catch (ex) {
                console.error(`[AdnRevitLinkRelpPanel]: ${ex}`);
                return '';
            }
        }

        genGuid() {
            let d = new Date().getTime();

            let guid = 'xxxx-xxxx-xxxx-xxxx'.replace(
                /[xy]/g,
                function (c) {
                    let r = (d + Math.random() * 16) % 16 | 0;
                    d = Math.floor(d / 16);
                    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
                });

            return guid;
        }

        async getLeafNodes(dbIds, model) {
            return new Promise((resolve, reject) => {
                try {
                    const instanceTree = model.getInstanceTree();
                    dbIds = dbIds || instanceTree.getRootId();
                    const dbIdArray = Array.isArray(dbIds) ? dbIds : [dbIds];
                    let leafIds = [];

                    const getLeafNodesRec = (id) => {
                        let childCount = 0;
                        instanceTree.enumNodeChildren(id, (childId) => {
                            getLeafNodesRec(childId);
                            ++childCount;
                        });

                        if (childCount == 0) {
                            leafIds.push(id);
                        }
                    }

                    for (let i = 0; i < dbIdArray.length; ++i) {
                        getLeafNodesRec(dbIdArray[i]);
                    }

                    return resolve(leafIds);
                } catch (ex) {
                    return reject(ex);
                }
            })
        }

        async getRevitLinkedElementIds(rvtLinkExternalIds, model) {
            const modelKey = model.getModelKey();
            const externalIdMap = this.modelExternalIdMaps[modelKey];
            const entities = Object.entries(externalIdMap);
            const linkedElementIds = rvtLinkExternalIds.map(instanceId => {
                return entities.filter(entity => entity[0].includes(`${instanceId}/`)).map(entity => entity[1]);
            })
                .flat();

            return linkedElementIds;
        }

        async getRevitHostElementIds(rvtLinkExternalIds, model) {
            const linkedElementIds = await this.getRevitLinkedElementIds(rvtLinkExternalIds, model);
            const leafNodeIds = await this.getLeafNodes(null, model);
            const hostElementIds = leafNodeIds.filter(dbId => !linkedElementIds.includes(dbId));

            return hostElementIds;
        }

        async requestContent() {
            const aecData = await Autodesk.Viewing.Document.getAecModelData(this.viewer.model.getDocumentNode());
            if (!aecData) return console.error(`[AdnRevitLinkRelpPanel]: AEC Model Data Not Found`);

            const rvtLinks = aecData.linkedDocuments;
            await this.buildExternalIdMaps();

            const model = this.viewer.model;
            const rootNode = {
                id: this.genGuid(),
                externalId: '',
                documentId: '',
                type: 'root',
                text: 'Root',
                children: [
                    {
                        id: this.genGuid(),
                        documentId: aecData.documentId,
                        externalId: aecData.documentId,
                        type: 'revit-host-document',
                        text: model.getDocumentNode().getModelName(),
                        children: []
                    }
                ]
            };

            const linksNodeGuid = this.genGuid();
            const linksNode = {
                id: linksNodeGuid,
                documentId: linksNodeGuid,
                externalId: linksNodeGuid,
                type: 'revit-links',
                text: 'Links',
                children: []
            };

            rootNode.children.push(linksNode);

            const nodes = [rootNode];

            for (let i = 0; i < rvtLinks.length; i++) {
                const rvtLink = rvtLinks[i];
                const rvtLinkName = await this.getRevitLinkName(rvtLink.instanceId, model);

                const node = {
                    id: rvtLink.documentId,
                    documentId: rvtLink.documentId,
                    externalId: rvtLink.instanceId,
                    type: 'revit-linked-document',
                    text: rvtLinkName,
                    children: []
                };

                linksNode.children.push(node);
            }

            $(this.treeContainer)
                .jstree({
                    core: {
                        data: nodes,
                        multiple: false,
                        themes: {
                            icons: false,
                            dots: false,
                            name: 'default-dark'
                        }
                    },
                    sort: function (a, b) {
                        const a1 = this.get_node(a);
                        const b1 = this.get_node(b);

                        if (a1.type == 'revit-linked-document' && b1.type == 'revit-linked-document') {
                            return (a1.text > b1.text) ? 1 : -1;
                        }
                        return 1;
                    },
                    types: {
                        'root': {},
                        'revit-host-document': {},
                        'revit-linked-document': {},
                        'revit-links': {}
                    },
                    plugins: ['types', 'sort', 'wholerow'],
                })
                .on('loaded.jstree', function (e, data) {
                    data.instance.open_all();
                })
                .on('hover_node.jstree', async (e, data) => {
                    //console.log(data);
                    let dbIds = null;
                    if (data.node.type == 'revit-linked-document') {
                        const rvtLinkExternalId = data.node.original.externalId;
                        dbIds = await this.getRevitLinkedElementIds([rvtLinkExternalId], model);
                    } else if (data.node.type == 'revit-host-document' || data.node.type == 'revit-links') {
                        const rvtLinkExternalIds = rvtLinks.map(rvtLink => rvtLink.instanceId);

                        if (data.node.type == 'revit-host-document') {
                            dbIds = await this.getRevitHostElementIds(rvtLinkExternalIds, model);
                        } else {
                            dbIds = await this.getRevitLinkedElementIds(rvtLinkExternalIds, model);
                        }
                    }

                    if (dbIds == null) return;

                    dbIds.forEach(dbId => this.viewer.impl.highlightObjectNode(this.viewer.model, dbId, true, false));
                })
                .on('dehover_node.jstree', async (e, data) => {
                    let dbIds = null;
                    if (data.node.type == 'revit-linked-document') {
                        const rvtLinkExternalId = data.node.original.externalId;
                        dbIds = await this.getRevitLinkedElementIds([rvtLinkExternalId], model);
                    } else if (data.node.type == 'revit-host-document' || data.node.type == 'revit-links') {
                        const rvtLinkExternalIds = rvtLinks.map(rvtLink => rvtLink.instanceId);

                        if (data.node.type == 'revit-host-document') {
                            dbIds = await this.getRevitHostElementIds(rvtLinkExternalIds, model);
                        } else {
                            dbIds = await this.getRevitLinkedElementIds(rvtLinkExternalIds, model);
                        }
                    }

                    if (dbIds == null) return;

                    dbIds.forEach(dbId => this.viewer.impl.highlightObjectNode(this.viewer.model, dbId, false));
                })
                .on('changed.jstree', async (e, data) => {
                    // console.log(e, data);
                    if (!data.node || !data.node.type) {
                        return;
                    }

                    if (data.action === 'select_node') {
                        this.viewer.clearSelection();
                        this.viewer.isolate();

                        console.log(data.node.type, data.node);

                        let dbIds = null;
                        if (data.node.type == 'revit-linked-document') {
                            const rvtLinkExternalId = data.node.original.externalId;
                            dbIds = await this.getRevitLinkedElementIds([rvtLinkExternalId], model);
                        } else if (data.node.type == 'revit-host-document' || data.node.type == 'revit-links') {
                            const rvtLinkExternalIds = rvtLinks.map(rvtLink => rvtLink.instanceId);

                            if (data.node.type == 'revit-host-document') {
                                dbIds = await this.getRevitHostElementIds(rvtLinkExternalIds, model);
                            } else {
                                dbIds = await this.getRevitLinkedElementIds(rvtLinkExternalIds, model);
                            }
                        } else {
                            // Do nothing   
                        }

                        //console.log(dbIds);

                        if (dbIds == null) return;

                        dbIds.forEach(dbId => this.viewer.impl.highlightObjectNode(this.viewer.model, dbId, false));
                        this.viewer.isolate(dbIds);
                    }
                });

            this.resizeToContent();
        }

        async createUI() {
            if (this.uiCreated) return;

            this.uiCreated = true;
            const div = document.createElement('div');

            const treeDiv = document.createElement('div');
            div.appendChild(treeDiv);
            this.treeContainer = treeDiv;
            this.scrollContainer.appendChild(div);

            if (this.viewer.model.isLoadDone()) {
                await this.requestContent();
            } else {
                this.viewer.addEventListener(
                    Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
                    () => this.requestContent(),
                    { once: true }
                );
            }
        }
    }

    class AdnRevitLinkRelpPanelExtension extends Autodesk.Viewing.Extension {
        constructor(viewer, options) {
            super(viewer, options);

            this.panel = null;
            this.createUI = this.createUI.bind(this);
            this.onToolbarCreated = this.onToolbarCreated.bind(this);
        }

        onToolbarCreated() {
            this.createUI();
        }

        createUI() {
            const viewer = this.viewer;

            const rvtRelpPanel = new AdnRevitLinkRelpPanel(viewer, 'Revit Link Relationship');

            viewer.addPanel(rvtRelpPanel);
            this.panel = rvtRelpPanel;

            const rvtRelpButton = new Autodesk.Viewing.UI.Button('toolbar-adnRevitRelpTool');
            rvtRelpButton.setToolTip('Revit Link Relationship');
            rvtRelpButton.setIcon('adsk-icon-documentModels');
            rvtRelpButton.onClick = function () {
                rvtRelpPanel.setVisible(!rvtRelpPanel.isVisible());
            };

            const subToolbar = new Autodesk.Viewing.UI.ControlGroup('toolbar-adn-tools');
            subToolbar.addControl(rvtRelpButton);
            subToolbar.adnRvtRelpButton = rvtRelpButton;
            this.subToolbar = subToolbar;

            viewer.toolbar.addControl(this.subToolbar);

            rvtRelpPanel.addVisibilityListener(function (visible) {
                if (visible)
                    viewer.onPanelVisible(rvtRelpPanel, viewer);

                rvtRelpButton.setState(visible ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            });
        }

        load() {
            if (this.viewer.toolbar) {
                // Toolbar is already available, create the UI
                this.createUI();
            }

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

            return true;
        }
    }

    Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.ADN.RevitLinkRelpPanel', AdnRevitLinkRelpPanelExtension);
})();