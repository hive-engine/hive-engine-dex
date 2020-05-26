import { DialogController } from 'aurelia-dialog';
import { autoinject, useView, PLATFORM } from 'aurelia-framework';

@autoinject()
@useView(PLATFORM.moduleName('./send.html'))
export class SendModal {
    private token;
    private transaction;

    constructor(private controller: DialogController) {
        this.controller.settings.lock = false;
        this.controller.settings.centerHorizontalOnly = true;
    }

    activate(token: string): void {
        this.token = token;
    }
}
