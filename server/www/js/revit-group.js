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
    class AdnRevitGroupTool extends Autodesk.Viewing.Extension {
        constructor(viewer, options) {
            super(viewer, options);
        }

        userFunction(pdb, viewableId) {
            //console.log(pdb, viewableId);

            let _nameAttrId = pdb.getAttrName();
            let _internalViewableInAttrId = pdb.getAttrViewableIn();
            let _internalGroupRefAttrId = -1;

            // Iterate over all attributes and find the index to the one we are interested in
            pdb.enumAttributes(function (i, attrDef, attrRaw) {
                let category = attrDef.category;
                let name = attrDef.name;

                if (name === 'Group' && category === '__internalref__') {
                    _internalGroupRefAttrId = i;
                    return true; // to stop iterating over the remaining attributes.
                }
            });

            //console.log( _internalGroupRefAttrId );

            // Early return is the model doesn't contain data for "Group".
            if (_internalGroupRefAttrId === -1)
                return null;

            let _internalMemberRefAttrId = -1;

            // Iterate over all attributes and find the index to the one we are interested in
            pdb.enumAttributes(function (i, attrDef, attrRaw) {

                let category = attrDef.category;
                let name = attrDef.name;

                if (name === 'Member' && category === '__internalref__') {
                    _internalMemberRefAttrId = i;
                    return true; // to stop iterating over the remaining attributes.
                }
            });

            //console.log( _internalMemberRefAttrId );

            // Early return is the model doesn't contain data for "Member".
            if (_internalMemberRefAttrId === -1)
                return null;

            let _categoryAttrId = -1;

            // Iterate over all attributes and find the index to the one we are interested in
            pdb.enumAttributes(function (i, attrDef, attrRaw) {
                let category = attrDef.category;
                let name = attrDef.name;

                if (name === 'Category' && category === '__category__') {
                    _categoryAttrId = i;
                    return true; // to stop iterating over the remaining attributes.
                }
            });

            //console.log( _categoryAttrId );

            // Early return is the model doesn't contain data for "Member".
            if (_categoryAttrId === -1)
                return null;

            const groups = [];
            // Now iterate over all parts to find all groups
            pdb.enumObjects(function (dbId) {
                let isGroup = false;

                // For each part, iterate over their properties.
                pdb.enumObjectProperties(dbId, function (attrId, valId) {
                    // Only process 'Caegory' property.
                    // The word "Property" and "Attribute" are used interchangeably.
                    if (attrId === _categoryAttrId) {
                        const value = pdb.getAttrValue(attrId, valId);
                        if (value === 'Revit Group') {
                            isGroup = true;
                            // Stop iterating over additional properties when "Category: Revit Group" is found.
                            return true;
                        }
                    }
                });

                if (!isGroup) return;

                const children = [];
                let groupName = '';

                // For each part, iterate over their properties.
                pdb.enumObjectProperties(dbId, function (attrId, valId) {
                    // Only process 'Member' property.
                    // The word "Property" and "Attribute" are used interchangeably.
                    if (attrId === _internalMemberRefAttrId) {
                        const value = pdb.getAttrValue(attrId, valId);
                        const props = pdb.getObjectProperties(value);
                        //console.log(value, pdb.getObjectProperties(value));
                        if (props.name.includes('Room Tag'))
                            return;

                        pdb.enumObjectProperties(value, function (childAttrId, childAttrValId) {
                            if (childAttrId === _internalViewableInAttrId) {
                                const childAttrVal = pdb.getAttrValue(childAttrId, childAttrValId);
                                //console.log(value, childAttrVal);

                                if ((childAttrVal == viewableId) && (!children.includes(value))) {
                                    children.push(value);
                                    return true;
                                }
                            }
                        });
                    }

                    if (attrId === _nameAttrId) {
                        const value = pdb.getAttrValue(attrId, valId);
                        const groupExtId = pdb.getIdAt(dbId);
                        if (groupExtId) {
                            const result = groupExtId.split('-');
                            const rvtElementId = parseInt(result[result.length - 1], 16);
                            groupName = `${value} [${rvtElementId}]`;
                        } else {
                            groupName = value;
                        }
                    }
                });

                if (children.length > 0) {

                    groups.push({
                        dbId,
                        name: groupName,
                        children
                    });
                }
            });

            return groups;
        }

        async build() {
            try {
                const fucString = this.userFunction.toString();
                const userFunction = `function ${fucString}`;
                const model = this.viewer.model;
                const viewableId = model.getDocumentNode().data['viewableID'];
                return await model.getPropertyDb().executeUserFunction(userFunction, viewableId);
            } catch (ex) {
                console.error(ex);
                return null;
            }
        }
    }

    Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.ADN.AdnRevitGroupTool', AdnRevitGroupTool);

    class AdnRevitGroupPanel extends Autodesk.Viewing.UI.DockingPanel {
        constructor(viewer, title, options) {
            options = options || {};

            //  Height adjustment for scroll container, offset to height of the title bar and footer by default.
            if (!options.heightAdjustment)
                options.heightAdjustment = 70;

            if (!options.marginTop)
                options.marginTop = 0;

            super(viewer.container, viewer.container.id + 'AdnRevitGroupPanel', title, options);

            this.container.classList.add('adn-docking-panel');
            this.container.classList.add('adn-rvt-group-panel');
            this.createScrollContainer(options);

            this.viewer = viewer;
            this.options = options;
            this.uiCreated = false;

            // Pre-load extension
            viewer.loadExtension('Autodesk.ADN.AdnRevitGroupTool');

            this.addVisibilityListener((show) => {
                if (!show) return;

                if (!this.uiCreated)
                    this.createUI();
            });

            this.onShowAll = this.onShowAll.bind(this);
        }

        onShowAll() {
            $(this.treeContainer).jstree().deselect_all(true);
        }

        get tool() {
            return this.viewer.getExtension('Autodesk.ADN.AdnRevitGroupTool');
        }

        async getGroupData() {
            try {
                return await this.tool?.build();
            } catch (ex) {
                console.error(ex);
                return null;
            }
        }

        genGuid(format = 'xxxxxxxxxx') {

            let d = new Date().getTime();

            return format.replace(
                /[xy]/g,
                function (c) {
                    let r = (d + Math.random() * 16) % 16 | 0;
                    d = Math.floor(d / 16);
                    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
                });
        }

        getNodeName(dbId) {
            return new Promise((resolve, reject) => {
                this.viewer.getProperties(
                    dbId,
                    result => {
                        let name = result.name;
                        const externalId = result.externalId;

                        if (externalId) {
                            const result = externalId.split('-');
                            const rvtElementId = parseInt(result[result.length - 1], 16);
                            name = `${name} [${rvtElementId}]`;
                        }
                        resolve(name);
                    },
                    error => reject(error)
                );
            });
        }

        async requestContent() {
            const data = await this.getGroupData();
            if (!data) return;

            const nodes = [];
            for (let i = 0; i < data.length; i++) {
                const group = data[i];

                if (!group || group.children.length <= 0) continue;

                const node = {
                    id: this.genGuid(),
                    dbId: group.dbId,
                    type: 'groups',
                    text: group.name,
                    children: await Promise.all(group.children.map(async (childId) => {
                        const childName = await this.getNodeName(childId);
                        return {
                            id: this.genGuid(),
                            dbId: childId,
                            type: 'members',
                            text: childName
                        };
                    }))
                };

                //node.children = node.children.filter(child => !child.name.includes('Room Tag'));

                nodes.push(node);
            }

            // if (nodes.length > 0) {
            //     nodes.sort((a, b) => {
            //         return (a.text > b.text) ? 1 : -1;
            //     });

            //     nodes[0].state = { 'opened': true };
            // }

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
                        return (a1.text > b1.text) ? 1 : -1;
                    },
                    types: {
                        groups: {},
                        members: {}
                    },
                    plugins: ['types', 'sort', 'wholerow'],
                })
                .on('hover_node.jstree', async (e, data) => {
                    //console.log(data);
                    if (data.node.type === 'groups') {
                        const children = data.node.children;
                        children.forEach(child => {
                            let node = data.instance.get_node(child);
                            this.viewer.impl.highlightObjectNode(this.viewer.model, node.original.dbId, true, false);
                        });
                    } else {
                        this.viewer.impl.highlightObjectNode(this.viewer.model, data.node.original.dbId, true, false);
                    }
                })
                .on('dehover_node.jstree', async (e, data) => {
                    if (data.node.type === 'groups') {
                        const children = data.node.children;
                        children.forEach(child => {
                            let node = data.instance.get_node(child);
                            this.viewer.impl.highlightObjectNode(this.viewer.model, node.original.dbId, false);
                        });
                    } else {
                        this.viewer.impl.highlightObjectNode(this.viewer.model, data.node.original.dbId, false);
                    }

                    const selSet = this.viewer.getSelection();
                    if (selSet.length > 0) {
                        this.viewer.clearSelection();
                        this.viewer.impl.clearOverlay('selection');
                        this.viewer.select(selSet);
                    }
                })
                .on('changed.jstree', async (e, data) => {
                    // console.log(e, data);
                    if (!data.node || !data.node.type) {
                        return;
                    }

                    this.viewer.clearSelection();
                    this.viewer.impl.clearOverlay('selection');

                    if (data.action === 'select_node') {
                        let dbIds = null;

                        if (data.node.type === 'groups') {
                            const children = data.node.children;
                            dbIds = children.map(child => {
                                let node = data.instance.get_node(child);
                                return node.original.dbId;
                            });
                            this.viewer.select(data.node.original.dbId);
                        } else {
                            dbIds = [data.node.original.dbId];
                            this.viewer.select(dbIds);
                        }

                        this.viewer.fitToView(dbIds);
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

            this.viewer.addEventListener(
                Autodesk.Viewing.SHOW_ALL_EVENT,
                this.onShowAll
            )
        }

        uninitialize() {
            if (this.tool)
                this.viewer.unloadExtension('Autodesk.ADN.AdnRevitGroupTool');

            this.viewer.removeEventListener(
                Autodesk.Viewing.SHOW_ALL_EVENT,
                this.onShowAll
            );

            super.uninitialize();
        }
    }

    class AdnRevitGroupPanelExtension extends Autodesk.Viewing.Extension {
        constructor(viewer, options) {
            super(viewer, options);

            this.panel = null;
            this.createUI = this.createUI.bind(this);
            this.onToolbarCreated = this.onToolbarCreated.bind(this);
            this.onGeometriesLoaded = this.onGeometriesLoaded.bind(this);
        }

        onToolbarCreated() {
            this.createUI();
        }

        onGeometriesLoaded() {
            this.viewer.getExtension('Autodesk.ViewCubeUi')?.setViewCube('front/top/right');
        }

        createUI() {
            const viewer = this.viewer;

            const rvtGroupPanel = new AdnRevitGroupPanel(viewer, 'Revit Groups');

            viewer.addPanel(rvtGroupPanel);
            this.panel = rvtGroupPanel;

            const rvtGroupButton = new Autodesk.Viewing.UI.Button('toolbar-adnRevitGroupTool');
            rvtGroupButton.setToolTip('Revit Group');
            rvtGroupButton.setIcon('adsk-icon-documentModels');
            rvtGroupButton.onClick = function () {
                rvtGroupPanel.setVisible(!rvtGroupPanel.isVisible());
            };

            const subToolbar = new Autodesk.Viewing.UI.ControlGroup('toolbar-adn-tools');
            subToolbar.addControl(rvtGroupButton);
            subToolbar.adnRvtGroupButton = rvtGroupButton;
            this.subToolbar = subToolbar;

            viewer.toolbar.addControl(this.subToolbar);

            rvtGroupPanel.addVisibilityListener(function (visible) {
                if (visible)
                    viewer.onPanelVisible(rvtGroupPanel, viewer);

                rvtGroupButton.setState(visible ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            });
        }

        load() {
            if (this.viewer.toolbar) {
                // Toolbar is already available, create the UI
                this.createUI();
            }

            if ((!this.viewer.model) || (!this.viewer.model.isLoadDone())) {
                this.viewer.addEventListener(
                    Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
                    this.onGeometriesLoaded,
                    { once: true });
            } else {
                this.onGeometriesLoaded();
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

    Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.ADN.RevitGroupPanel', AdnRevitGroupPanelExtension);
})();