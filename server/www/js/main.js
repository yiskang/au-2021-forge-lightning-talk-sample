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
    const baseUrl = window.location.href.split('?')[0];
    Autodesk.Viewing.theExtensionManager.registerExternalExtension('Autodesk.ADN.RevitAggregationHelper', `${baseUrl}js/revit-aggregation.js`);
    Autodesk.Viewing.theExtensionManager.registerExternalExtension('Autodesk.ADN.RevitGroupPanel', `${baseUrl}js/revit-group.js`);
    Autodesk.Viewing.theExtensionManager.registerExternalExtension('Autodesk.ADN.RevitLinkRelpPanel', `${baseUrl}js/revit-link-relp.js`);

    $('button#rvt-aggregate-btn').click((event) => {
        $('button.button-primary').removeClass('button-primary');
        $('button#rvt-aggregate-btn').addClass('button-primary');

        const modelData = [
            { name: 'Small_Medical_Office_Arch_2020.rvt', urn: 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6OWR5YXI1enNtZ2NsaWJiYWVuaHQ5YmFjaWYyMnpvN3ctc2FuZGJveC9TbWFsbF9NZWRpY2FsX09mZmljZV9BcmNoXzIwMjAucnZ0' },
            { name: 'Small_Medical_Office_MEP_2020v2.rvt', urn: 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6OWR5YXI1enNtZ2NsaWJiYWVuaHQ5YmFjaWYyMnpvN3ctc2FuZGJveC9TbWFsbF9NZWRpY2FsX09mZmljZV9NRVBfMjAyMHYyLnJ2dA' },
            { name: 'Small_Medical_Office_Struct_2020.rvt', urn: 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6OWR5YXI1enNtZ2NsaWJiYWVuaHQ5YmFjaWYyMnpvN3ctc2FuZGJveC9TbWFsbF9NZWRpY2FsX09mZmljZV9TdHJ1Y3RfMjAyMC5ydnQ' }
        ];

        destroyViewer();
        launchAggregateViewer(modelData, null);
    });

    $('button#rvt-link-relp-btn').click((event) => {
        $('button.button-primary').removeClass('button-primary');
        $('button#rvt-link-relp-btn').addClass('button-primary');

        const viewerOptions = {
            extensions: ['Autodesk.ADN.RevitLinkRelpPanel']
        };

        destroyViewer();
        launchViewer('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6OWR5YXI1enNtZ2NsaWJiYWVuaHQ5YmFjaWYyMnpvN3ctc2FuZGJveC9TbWFsbF9NZWRpY2FsX09mZmljZV9BcmNoXzIwMjAuemlw', 'b2dba70d-4039-4e7d-ab2e-8b2d5ff5fb31-000911d4', viewerOptions);
    });

    $('button#rvt-group-btn').click((event) => {
        $('button.button-primary').removeClass('button-primary');
        $('button#rvt-group-btn').addClass('button-primary');

        const viewerOptions = {
            extensions: ['Autodesk.ADN.RevitGroupPanel']
        };

        destroyViewer();
        launchViewer('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6OWR5YXI1enNtZ2NsaWJiYWVuaHQ5YmFjaWYyMnpvN3ctc2FuZGJveC9hcGFydG1lbnQtZ3JvdXAtc2FtcGxlLnJ2dA', null, viewerOptions);
    });
});