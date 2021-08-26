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

$(document).ready(function () {
    Autodesk.Viewing.theExtensionManager.registerExternalExtension('Autodesk.ADN.RevitGroupPanel', `${window.location.href}js/revit-group.js`);
    Autodesk.Viewing.theExtensionManager.registerExternalExtension('Autodesk.ADN.RevitLinkRelpPanel', `${window.location.href}js/revit-link-relp.js`);

    $('button#rvt-group-btn').click((event) => {
        const viewerOptions = {
            extensions: ['Autodesk.ADN.RevitGroupPanel']
        };

        destroyViewer();
        launchViewer('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6ZXh0cmFjdC1hdXRvZGVzay1pby0yMDE3bGt3ZWo3eHBiZ3A2M3g0aGwzMzV5Nm0yNm9ha2dnb2YvYXBhcnRtZW50LWdyb3VwLXNhbXBsZS5ydnQ', null, viewerOptions);
    });

    $('button#rvt-link-relp-btn').click((event) => {
        const viewerOptions = {
            extensions: ['Autodesk.ADN.RevitLinkRelpPanel']
        };

        destroyViewer();
        launchViewer('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6ZXh0cmFjdC1hdXRvZGVzay1pby0yMDE3bGt3ZWo3eHBiZ3A2M3g0aGwzMzV5Nm0yNm9ha2dnb2YvU21hbGxfTWVkaWNhbF9PZmZpY2VfQXJjaF8yMDIwLnppcA', 'b2dba70d-4039-4e7d-ab2e-8b2d5ff5fb31-000911d4', viewerOptions);
    });
});