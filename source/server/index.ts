/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import * as path from "path";
import * as express from "express";

import ExpressServer, { IExpressServerConfiguration } from "./ExpressServer";

////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION

const port = parseInt(process.env["NODE_SERVER_PORT"]) || 8000;
const devMode = process.env.NODE_ENV !== "production";
const localMode = process.env.NODE_SERVER_LOCAL === "true";
const rootDir = process.env["NODE_SERVER_ROOT"] || path.resolve(__dirname, "../../..");
const staticDir = path.resolve(rootDir, "../../dist/");
const fileDir = path.resolve(rootDir, "../../files/");
const docDir = path.resolve(rootDir, "../../doc/code/");

////////////////////////////////////////////////////////////////////////////////
// CONFIGURE, START SERVER

console.log([
    "",
    "------------------------------------------",
    "3D Foundation Project - Development Server",
    "------------------------------------------",
    "Port: " + port,
    "Root Directory: " + rootDir,
    "Static File Directory: " + staticDir,
    "WebDAV File Directory: " + fileDir,
    "Development Mode: " + devMode,
    "Local Mode: " + localMode
].join("\n"));


const expressServerConfig: IExpressServerConfiguration = {
    port,
    enableDevMode: devMode,
    enableLogging: devMode,
    staticRoute: "/",
    staticDir,
    fileDir,
    docDir
};

const expressServer = new ExpressServer(expressServerConfig);

expressServer.start().then(() => {
    console.info(`\nServer ready and listening on port ${port}`);
});
