import { TokenInfoModal } from 'modals/wallet/token-info';
import { HiveEngine } from 'services/hive-engine';
import { autoinject, observable, TaskQueue, bindable } from 'aurelia-framework';

import { connectTo, dispatchify, Store } from 'aurelia-store';
import { loadTokensList, loadTokenSymbols, getCurrentFirebaseUser } from 'store/actions';

import styles from './tokens.module.css';
import { DialogService, DialogCloseResult } from 'aurelia-dialog';
import { BuyTokenModal } from 'modals/buy-token';
import { DepositModal } from 'modals/deposit';
import { WithdrawModal } from 'modals/withdraw';
import { loadTokens } from 'common/hive-engine';
import { Subscription as StateSubscription } from 'rxjs';

@autoinject()
@connectTo()
export class Tokens {    
    private styles = styles;
    private state: State;
    private loading = false;    
    private peggedTokens = [];
    private currentLimit = 1000;
    private currentOffset = 0;
    private subscription: StateSubscription;

    @bindable tokenList = [];
    @bindable tab = 'engine';

    constructor(private he: HiveEngine, private taskQueue: TaskQueue, private dialogService: DialogService, private store: Store<State>) {
        this.subscription = this.store.state.subscribe(async (state: State) => {
            this.state = state;
        });
    }

    async canActivate() {
        let peggedCoins = await this.he.getPeggedTokens();
        let peggedTokenSymbols = [];
        peggedCoins.forEach(x => peggedTokenSymbols.push(x.symbol));

        this.peggedTokens = await loadTokens(peggedTokenSymbols, 50, 0);

        await dispatchify(loadTokensList)(this.currentLimit, this.currentOffset);           

        this.tokenList = this.state.tokens;
    }

    toggleTokens(tabVal) {
        this.tab = tabVal;
        if (this.tab == 'engine') {
            this.tokenList = this.state.tokens;
        } else {
            this.tokenList = this.peggedTokens;
        }
    }

    async activate() {
        await dispatchify(getCurrentFirebaseUser)();
    }

    buyBEE() {
        this.dialogService
            .open({ viewModel: BuyTokenModal, model: 'BEE' })
            .whenClosed(x => this.walletDialogCloseResponse(x));
    }

    async walletDialogCloseResponse(response: DialogCloseResult) {
        console.log(response);

        // reload data if necessary
        if (!response.wasCancelled) {
        }
    }
        
    deposit() {
        this.dialogService.open({ viewModel: DepositModal }).whenClosed(response => {
            console.log(response);
        });
    }
    withdraw() {
        this.dialogService.open({ viewModel: WithdrawModal }).whenClosed(response => {
            console.log(response);
        });
    }
}
