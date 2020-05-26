import { Router } from 'aurelia-router';
import { I18N } from 'aurelia-i18n';
import { dispatchify } from 'aurelia-store';
import { HiveEngine } from 'services/hive-engine';
import { DialogController } from 'aurelia-dialog';
import { autoinject, view, PLATFORM } from 'aurelia-framework';
import { Subscription } from 'rxjs';
import { environment } from 'environment';
import { ToastService } from 'services/toast-service';
import { login } from 'store/actions';

import styles from './signin.module.css';

@autoinject()
@view(PLATFORM.moduleName('./signin.html'))
export class SigninModal {
    private styles = styles;
    private environment = environment;
    private subscription: Subscription;
    private loading = false;
    private usePrivateKey = false;
    private username;
    private privateKey;
    private useKeychain = false;

    constructor(private controller: DialogController, private se: HiveEngine, 
        private i18n: I18N, private router: Router, private toast: ToastService) {
        this.controller.settings.lock = false;
        this.controller.settings.centerHorizontalOnly = true;
    }

    attached(): void {
        if (window.hive_keychain) {
            window.hive_keychain.requestHandshake(() => {
                this.useKeychain = true;
            });
        }
    }

    async keychainSignIn(): Promise<void> {
        try {
            this.loading = true;

            const { username } = await this.se.login(this.username.trim().toLowerCase()) as any;

            await dispatchify(login)(username);

            this.controller.close(true);

            this.loading = false;
        } catch (e) {
            this.loading = false;
        }
    }

    async keySignIn(): Promise<void>  {
        try {
            this.loading = true;

            const { username } = await this.se.login(this.username.trim().toLowerCase(), this.privateKey.trim()) as any;
        
            await dispatchify(login)(username);

            this.controller.close(true);

            this.loading = false;
        } catch (e) {
            this.loading = false;
        }
    }
}
