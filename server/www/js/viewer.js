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

function launchViewer(urn, viewableId = null, viewerOptions = null) {
    const options = {
        env: 'MD20Prod' + (atob(urn.replace('urn:', '').replace('_', '/')).indexOf('emea') > -1 ? 'EU' : 'US'),
        api: 'D3S',
        getAccessToken: getForgeToken
    };

    if (LMV_VIEWER_VERSION >= '7.48') {
        options.env = 'AutodeskProduction2';
        options.api = 'streamingV2' + (atob(urn.replace('urn:', '').replace('_', '/')).indexOf('emea') > -1 ? '_EU' : '');
    }

    let viewer;

    Autodesk.Viewing.Initializer(options, () => {
        if (!viewerOptions) {
            viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'));
        } else {
            viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), viewerOptions);
        }

        viewer.start();
        const documentId = `urn:${urn}`;
        Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    });

    function onDocumentLoadSuccess(doc) {
        // if a viewableId was specified, load that view, otherwise the default view
        const viewables = (viewableId ? doc.getRoot().findByGuid(viewableId).getDefaultGeometry() : doc.getRoot().getDefaultGeometry(true));
        viewer.loadDocumentNode(doc, viewables, { skipHiddenFragments: false }).then(async (model) => {
            // documented loaded, any action?
            console.log({
                'is SVF2?': model.isSVF2(),
                'LMV version': LMV_VIEWER_VERSION
            });
        });
    }

    function onDocumentLoadFailure(viewerErrorCode) {
        console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
    }
}

function getForgeToken(callback) {
    fetch('/api/forge/oauth/token').then(res => {
        res.json().then(data => {
            callback(data.access_token, data.expires_in);
        });
    });
}

function destroyViewer() {
    if (window.NOP_VIEWER) {
        NOP_VIEWER.finish();
        delete NOP_VIEWER;
    }
}