import { HiveEngine } from 'services/hive-engine';
import { DialogController } from 'aurelia-dialog';
import { autoinject, TaskQueue, useView, PLATFORM } from 'aurelia-framework';
import styles from './nft-properties.module.css';

@autoinject()
@useView(PLATFORM.moduleName('modals/nft/nft-properties.html'))
export class NftPropertiesModal {
    private properties: any;
    private lockedTokens: Map<string, string>;
    private styles = styles;

    constructor(private controller: DialogController, private se: HiveEngine, private taskQueue: TaskQueue) {
        this.controller.settings.lock = false;
        this.controller.settings.centerHorizontalOnly = true;    
    }

    async activate(token) {
        this.lockedTokens = new Map(Object.entries(token.lockedTokens));
        this.properties = token.properties;
    }
}
