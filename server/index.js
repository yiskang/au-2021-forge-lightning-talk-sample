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

const jsonServer = require('json-server');
const path = require('path');

const { DIRNAME } = require('./expose');
const routes = require('./routes.json');
const config = require('./config');

const PORT = config.port;
if (config.credentials.client_id == null || config.credentials.client_secret == null) {
    console.error('Missing FORGE_CLIENT_ID or FORGE_CLIENT_SECRET env. variables.');
    return;
}

const dbFile = path.join(DIRNAME, 'db.json');
const server = jsonServer.create();
const foreignKeySuffix = '_id';
const router = jsonServer.router(dbFile, { foreignKeySuffix });

const defaultsOpts = {
    static: path.join(DIRNAME, 'www'),
    bodyParser: true
};
const middleware = jsonServer.defaults(defaultsOpts);
const rewriter = jsonServer.rewriter(routes);

server.use(middleware);
server.use('/api/forge/oauth', require('./routes/oauth'));
server.use('/api/forge/oss', require('./routes/oss'));
server.use('/api/forge/modelderivative', require('./routes/modelderivative'));
server.use((err, req, res, next) => {
    if (!err) {
        next();
    } else {
        console.error(err);
        res.status(err.statusCode).json(err);
    }
});

server.use(rewriter);
server.use(router);
server.listen(PORT, () => {
    console.log('JSON API server running on port %d', PORT);
});