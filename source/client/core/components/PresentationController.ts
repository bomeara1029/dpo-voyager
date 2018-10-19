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

import resolvePathname from "resolve-pathname";

import { IPublisherEvent } from "@ff/core/Publisher";

import { IPresentation, IItem } from "common/types";
import * as template from "../templates/presentation.json";

import { EDerivativeQuality } from "../app/Derivative";
import PickManip from "./PickManip";
import OrbitManip from "./OrbitManip";

import Loaders from "../loaders/Loaders";
import Presentation from "../app/Presentation";
import Item from "../app/Item";

import Controller, { Actions, Commander } from "./Controller";

////////////////////////////////////////////////////////////////////////////////

export type ExplorerActions = Actions<PresentationController>;

export interface IPresentationChangeEvent extends IPublisherEvent<PresentationController>
{
    current: Presentation;
    next: Presentation;
}

export default class PresentationController extends Controller<PresentationController>
{
    static readonly type: string = "PresentationController";

    actions: ExplorerActions = null;
    loaders: Loaders = new Loaders();

    protected presentations: Presentation[] = [];
    protected presentation: Presentation = null;

    create()
    {
        super.create();
        this.addEvents("presentation");
    }

    createActions(commander: Commander)
    {
        const actions = {
            loadPresentation: commander.register({
                name: "Load Presentation", do: this.loadPresentation, target: this
            })
        };

        this.actions = actions;
        return actions;
    }

    get activePresentation(): Presentation
    {
        return this.presentation;
    }

    loadModel(modelUrl: string, quality?: EDerivativeQuality, templateUrl?: string): Promise<void>
    {
        return Promise.resolve().then(() => {
            console.log(`Creating new 3D item with a web derivative, quality: ${EDerivativeQuality[quality]}\n`,
                `model url: ${modelUrl}`);
            const item = new Item(this.system, this.loaders);
            item.addWebModelDerivative(modelUrl, quality);

            return this.openDefaultPresentation(modelUrl, item);
        });
    }

    loadGeometryAndTexture(geometryUrl: string, textureUrl?: string, quality?: EDerivativeQuality): Promise<void>
    {
        return Promise.resolve().then(() => {
            console.log(`Creating a new 3D item with a web derivative of quality: ${EDerivativeQuality[quality]}\n`,
                `geometry url: ${geometryUrl}, texture url: ${textureUrl}`);
            const item = new Item(this.system, this.loaders);
            item.addGeometryAndTextureDerivative(geometryUrl, textureUrl, quality);

            return this.openDefaultPresentation(geometryUrl, item);
        });
    }

    loadItem(itemUrl: string, templatePath?: string): Promise<void>
    {
        return this.loaders.loadJSON(itemUrl).then(json =>
            this.openItem(json, itemUrl, templatePath)
        );
    }

    openItem(json: any, url?: string, templatePathOrUrl?: string): Promise<void>
    {
        url = url || window.location.href;

        const templateName = templatePathOrUrl
            ? templatePathOrUrl.substr(resolvePathname(".", templatePathOrUrl).length)
            : "";

        return this.loaders.validateItem(json).then(itemData => {
            const item = new Item(this.system, this.loaders);
            item.inflate(itemData, url);

            if (item.templateName) {
                const templateUrl =  resolvePathname(templateName, item.templateName, templatePathOrUrl || url);
                console.log(`Loading presentation template: ${templateUrl}`);
                return this.loadPresentation(templateUrl, item);
            }

            return this.openDefaultPresentation(url, item);
        });
    }

    loadPresentation(url: string, item?: Item): Promise<void>
    {
        return this.loaders.loadJSON(url).then(json =>
            this.openPresentation(json, url, item)
        );
    }

    openPresentation(json: any, url?: string, item?: Item): Promise<void>
    {
        url = url || window.location.href;

        return this.loaders.validatePresentation(json).then(presentationData => {
            const presentation = new Presentation(this.system, this.loaders);
            presentation.inflate(presentationData, url, item);

            this.presentations.push(presentation);
            this.setActivePresentation(this.presentations.length - 1);
            presentation.loadModels();
        });
    }

    openDefaultPresentation(url?: string, item?: Item): Promise<void>
    {
        console.log("opening presentation from default template");
        return this.openPresentation(template, url, item);
    }

    writePresentation(): IPresentation
    {
        return this.activePresentation.deflate();
    }

    protected setActivePresentation(index: number)
    {
        const current = this.presentation;
        const next = this.presentation = this.presentations[index];

        this.onPresentationChange(current, next);
        this.emit<IPresentationChangeEvent>("presentation", { current, next });
    }

    protected onPresentationChange(current: Presentation, next: Presentation)
    {
        const pickManip = this.system.getComponent(PickManip);
        const orbitManip = this.system.getComponent(OrbitManip);

        if (current) {
            pickManip.setRoot(null);

            // detach camera from orbit manip
            const cameraTransform = current.cameraTransform;
            if (cameraTransform) {
                cameraTransform.in("Matrix").unlinkFrom(orbitManip.out("Matrix"));
            }

            const cameraComponent = current.cameraComponent;
            if (cameraComponent) {
                cameraComponent.in("Projection").unlinkFrom(orbitManip.out("Projection"));
            }

            // detach light group from orbit manip
            const lightsTransform = current.lightsTransform;
            if (lightsTransform) {
                lightsTransform.in("Rotation").unlinkFrom(orbitManip.out("Inverse.Orbit"));
            }
        }

        if (next) {
            pickManip.setRoot(next.scene);

            // attach camera to orbit manip
            const cameraTransform = next.cameraTransform;
            if (cameraTransform) {
                orbitManip.setFromMatrix(cameraTransform.matrix);
                cameraTransform.in("Matrix").linkFrom(orbitManip.out("Matrix"));
            }

            const cameraComponent = next.cameraComponent;
            if (cameraComponent) {
                cameraComponent.in("Projection").linkFrom(orbitManip.out("Projection"));
            }

            // attach lights group to orbit manip
            const lightsTransform = next.lightsTransform;
            if (lightsTransform) {
                lightsTransform.in("Order").setValue(4);
                lightsTransform.in("Rotation").linkFrom(orbitManip.out("Inverse.Orbit"));
            }
        }
    }
}