import { AuthService } from './auth-service';
import { I18N } from 'aurelia-i18n';
import { HttpClient, json } from 'aurelia-fetch-client';
import { lazy, autoinject } from 'aurelia-framework';
import { environment } from 'environment';

import firebase from 'firebase/app';

import SSC from 'sscjs';
import hive from 'steem';

import { Store } from 'aurelia-store';
import { Subscription } from 'rxjs';

import { loadTokens, checkTransaction, getFormattedCoinPairs } from 'common/hive-engine';
import { hiveSignerJsonId, hiveSignerJson, getAccount, hiveSignerTransfer } from 'common/hive';

import { ToastService, ToastMessage } from './toast-service';
import { queryParam, formatHiveAmount, getHivePrice, toFixedNoRounding } from 'common/functions';
import { customJson, requestTransfer } from 'common/keychain';
import moment from 'moment';

hive.api.setOptions({url: 'https://api.openhive.network'});

@autoinject()
export class HiveEngine {
    public accountsApi: HttpClient;
    public http: HttpClient;
    public ssc;
    public state: State;

    public user = {
        name: '',
        account: {},
        balances: [],
        scotTokens: [],
        pendingUnstakes: [],
        pendingUndelegations: []
    };

    public params = {};
    public tokens = [];
    public scotTokens = {};
    public steemPrice = 0;
    public storeSubscription: Subscription;
    public _hs_callback;

    constructor(
        @lazy(HttpClient) getHttpClient: () => HttpClient,
        private i18n: I18N,
        private store: Store<State>,
        private toast: ToastService,
        private authService: AuthService) {
            this.storeSubscription = this.store.state.subscribe(state => {
                if (state) {
                    this.state = state;

                    this.user = state.account as any;
                }
            });

        this.accountsApi = getHttpClient();
        this.http = getHttpClient();

        this.ssc = new SSC(environment.RPC_URL);

        this.accountsApi.configure(config => {
            config
                .useStandardConfiguration()
                .withBaseUrl(environment.ACCOUNTS_API_URL);
        });

        this.http.configure(config => config.useStandardConfiguration());
    }

    unbind() {
        this.storeSubscription.unsubscribe();
    }

    getUser() {
        return this.user?.name ?? null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request(url: string, params: any = {}) {
        // Cache buster
        params.v = new Date().getTime();

        url = url + queryParam(params);

        return this.http.fetch(url, {
            method: 'GET'
        });
    }

    async login(username: string, key?: string): Promise<unknown> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            if (window.hive_keychain && !key) {
                // Get an encrypted memo only the user can decrypt with their private key
                const encryptedMemo = await this.authService.getUserAuthMemo(username) as string;

                window.hive_keychain.requestVerifyKey(username, encryptedMemo, 'Posting', async response => {
                    if (response.error) {
                        const toast = new ToastMessage();

                        toast.message = this.i18n.tr('errorLogin', {
                            ns: 'notifications'
                        });

                        this.toast.error(toast);
                    } else {
                        // Get the return memo and remove the '#' at the start of the private memo
                        const signedKey = (response.result as unknown as string).substring(1);

                        // The decrypted memo is an encrypted string, so pass this to the server to get back refresh and access tokens
                        const token = await this.authService.verifyUserAuthMemo(response.data.username, signedKey) as string;

                        await firebase.auth().signInWithCustomToken(token);

                        resolve({ username, token });
                    }
                });
            } else {
                try {
                    if (key && !hive.auth.isWif(key)) {
                        key = hive.auth.getPrivateKeys(username, key, ['posting']).posting;
                    }
                } catch (err) {
                    const toast = new ToastMessage();

                    toast.message = this.i18n.tr('invalidPrivateKeyOrPassword', {
                        ns: 'errors'
                    });

                    this.toast.error(toast);
                    return;
                }

                try {
                    const user = await getAccount(username);

                    if (user) {
                        try {
                            if (hive.auth.wifToPublic(key) == user.memo_key || hive.auth.wifToPublic(key) === user.posting.key_auths[0][0]) {
                                // Get an encrypted memo only the user can decrypt with their private key
                                const encryptedMemo = await this.authService.getUserAuthMemo(username);

                                // Decrypt the private memo to get the encrypted string
                                const signedKey = hive.memo.decode(key, encryptedMemo).substring(1);

                                // The decrypted memo is an encrypted string, so pass this to the server to get back refresh and access tokens
                                const token = await this.authService.verifyUserAuthMemo(username, signedKey) as string;

                                await firebase.auth().signInWithCustomToken(token);

                                resolve({ username, token });
                            } else {
                                const toast = new ToastMessage();

                                toast.message = this.i18n.tr('errorLogin', {
                                    ns: 'notifications'
                                });

                                this.toast.error(toast);
                            }
                        } catch (err) {
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorLogin', {
                                ns: 'notifications'
                            });

                            this.toast.error(toast);
                        }
                    } else {
                        const toast = new ToastMessage();

                        toast.message = this.i18n.tr('errorLoading', {
                            ns: 'notifications'
                        });

                        this.toast.error(toast);
                    }
                } catch (e) {
                    return;
                }
            }
        });
    }

    async logout() {
        return firebase.auth().signOut();
        //dispatchify(logout)();
    }

    async loadPendingUnstakes(account) {
        let result: IPendingUnstakeTransaction[] = await this.ssc.find('tokens', 'pendingUnstakes', { account: account }, 1000, 0, '', false);

        if (result != null) {
            result = result.map(o => {
                o.timestamp_string = moment.unix(o.nextTransactionTimestamp / 1000).format('YYYY-M-DD HH:mm:ss');
                return o;
            });
        }

        if (this.user && account === this.user.name) {
            this.user.pendingUnstakes = result;
        }

        return result;
    }

    async loadPendingUndelegations(account) {
        let result: IPendingUndelegationTransaction[] = await this.ssc.find('tokens', 'pendingUndelegations', { account: account }, 1000, 0, '', false);

        if (result != null) {
            result = result.map(o => {
                o.timestamp_string = moment.unix(o.completeTimestamp / 1000).format('YYYY-M-DD HH:mm:ss');
                return o;
            });
        }

        if (this.user && account === this.user.name) {
            this.user.pendingUndelegations = result;
        }

        return result;
    }

    async getScotUsertokens(account) {
        const tokens: IScotToken[] = [];
        if (!account && this.user) {
            account = this.user.name;
        }

        if (account) {
            const url = `${environment.SCOT_API}@${account}?`;
            const req = await this.request(url);
            const results = await req.json();

            if (results) {
                for (const key in results) {
                    const token: IScotToken = results[key];
                    tokens.push(token);
                }
            }

            if (tokens) {
                this.user.scotTokens = tokens;
            }

            return tokens;
        }

        return [];
    }

    async claimAllTokens(allTokens: IRewardToken[]) {
        let claimTokenResult = false;
        const claimData = [];

        if (allTokens) {
            allTokens.forEach(x => claimData.push({ "symbol": x.symbol }));
        }

        claimTokenResult = await this.claimTokenCall(claimData, `Claim All Tokens`);

        return claimTokenResult;
    }

    async claimToken(symbol: string) {
        let claimTokenResult = false;        

        const scotToken = this.user.scotTokens.find(function (x) { return x.symbol === symbol });
        const amount = scotToken.pending_token;
        const factor = Math.pow(10, scotToken.precision);
        const calculated = amount / factor;

        const claimData = {
            symbol
        };

        claimTokenResult = await this.claimTokenCall(claimData, `Claim ${calculated} ${symbol.toUpperCase()} Tokens`);

        return claimTokenResult;
    }

    async claimTokenCall(claimData, displayName) {    
        const username = this.getUser();
        let claimTokenResult = false;

        if (window && window.hive_keychain) {
            const response = await customJson(username, 'scot_claim_token', 'Posting', JSON.stringify(claimData), displayName);

            if (response.success && response.result) {
                claimTokenResult = true;

                const toast = new ToastMessage();

                toast.message = this.i18n.tr('claimSucceeded', {
                    ns: 'notifications'
                });

                this.toast.success(toast);
            } else {
                const toast = new ToastMessage();

                toast.message = this.i18n.tr('errorSubmittedTransfer', {
                    ns: 'errors'
                });

                this.toast.error(toast);
            }
        } else {
            hiveSignerJsonId(this.user.name, 'posting', 'scot_claim_token', claimData, () => {
                claimTokenResult = true;
            });
        }

        return claimTokenResult;
    }

    async enableDelegation(symbol: string, undelegationCooldown: string): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading

            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transaction_data = {
                contractName: 'tokens',
                contractAction: 'enableDelegation',
                contractPayload: {
                    'symbol': symbol,
                    'undelegationCooldown': parseInt(undelegationCooldown, 10)
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transaction_data), 'Enable Token Delegation', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('enableDelegationSucceeded', {
                                symbol,
                                undelegationCooldown,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to unstake tokens: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transaction_data, () => {
                    resolve(true);
                });
            }
        });
    }

    async enableStaking(symbol, unstakingCooldown, numberTransactions): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading

            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'enableStaking',
                contractPayload: {
                    'symbol': symbol,
                    'unstakingCooldown': parseInt(unstakingCooldown, 10),
                    'numberTransactions': parseInt(numberTransactions, 10)
                }
            };

            if (window && window.hive_keychain) {
                hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Enable Token Staking', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('enableStakingSucceeded', {
                                symbol,
                                unstakingCooldown,
                                numberTransactions,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to unstake tokens: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async stake(symbol: string, quantity: string, to: string): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'stake',
                contractPayload: {
                    'to': to,
                    'symbol': symbol,
                    'quantity': quantity
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Stake Token', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('stakingSucceeded', {
                                quantity,
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async unstake(symbol: string, quantity: string): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading

            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transaction_data = {
                contractName: 'tokens',
                contractAction: 'unstake',
                contractPayload: {
                    symbol,
                    quantity
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transaction_data), 'Unstake Token', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('unstakingSucceeded', {
                                quantity,
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Tokens successfully unstaked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to unstake tokens: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transaction_data, () => {
                    resolve(true);
                });
            }
        });
    }

    async cancelUnstake(txID): Promise<any> {
        return new Promise((resolve) => {
            // Show loading

            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transaction_data = {
                contractName: 'tokens',
                contractAction: 'cancelUnstake',
                contractPayload: {
                    txID
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transaction_data), 'Cancel Unstake Tokens', async (response) => {
                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('unstakeCancelled', {
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token unstaking cancelled' toastr
                        } catch (e) {
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transaction_data, () => {
                    resolve(true);
                });
            }
        });
    }

    steemConnectCallback() {
        if (this._hs_callback) {
            // Show loading

            setTimeout(() => {
                // Hide loading

                this._hs_callback();
                this._hs_callback = null;

            }, 10000);
        }
    }

    async loadParams() {
        let loaded = 0;

        this.ssc.findOne('sscstore', 'params', {}, (err, result) => {
            if (result && !err) {
                Object.assign(this.params, result);
            }

            if (++loaded >= 3) {
                return this.params;
            }
        });

        this.ssc.findOne('tokens', 'params', {}, (err, result) => {
            if (result && !err) {
                Object.assign(this.params, result);
            }

            if (++loaded >= 3) {
                return this.params;
            }
        });

        getHivePrice().then(() => {
            if (++loaded >= 3) {
                return this.params;
            }
        });
    }

    async sendToken(symbol: string, to: string, quantity: number, memo: string): Promise<any> {
        return new Promise((resolve) => {
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transaction_data = {
                'contractName': 'tokens',
                'contractAction': 'transfer',
                'contractPayload': {
                    'symbol': symbol,
                    'to': to,
                    'quantity': quantity,
                    'memo': memo
                }
            };

            console.log('SENDING: ' + symbol);

            if (window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transaction_data), 'Token Transfer: ' + symbol, async (response) => {
                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('tokensSent', {
                                quantity,
                                symbol,
                                to,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);
                        } catch (e) {
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // hide
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transaction_data, () => {
                    resolve(true);
                });
            }
        });
    }

    async getBalance(t) {
        let balanceVal = 0;

        if (this.user && this.user.balances) {
            const username = this.getUser();

            if (this.tokens.length == 0) {
                const tokenResponse = await loadTokens();

                if (tokenResponse)
                    this.tokens = tokenResponse;
            }

            const userBalances = await this.userBalances(t, username);

            if (userBalances) {
                this.user.balances = userBalances;

                const token = this.user.balances.find(b => b.symbol === t);
                if (token)
                    balanceVal = parseFloat(token.balance);
            }

            return balanceVal;
        }
    }

    getToken(symbol: string) {
        return this.tokens.find(t => t.symbol === symbol);
    }

    getTokens() {
        return this.tokens;
    }   

    async checkAccount(name) {
        const response = await hive.api.getAccountsAsync([name]);

        if (response && response.length) {
            return response[0];
        }

        return null;
    }

    async userBalances(symbol, account) {
        if (symbol == environment.peggedToken) {
            symbol = environment.nativeToken;
        }

        const token = this.getToken(symbol);

        if (token && token.metadata && token.metadata.hide_in_market) {
            return false;
        }

        return this.ssc.find('tokens', 'balances', { account: account, symbol: { '$in': [symbol, 'SWAP.HIVE'] } }, 2, 0, '', false);
    }

    async issueToken(symbol, to, quantity) {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'issue',
                contractPayload: {                    
                    'symbol': symbol,
                    'to': to,
                    'quantity': quantity
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Token Issue: ' + symbol, async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('issueSucceeded', {
                                quantity,
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async updatePrecision(symbol, precision) {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'updatePrecision',
                contractPayload: {
                    'symbol': symbol,
                    'precision': parseInt(precision, 10)
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Update Token Precision', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('updatePrecisionSucceeded', {
                                symbol,
                                username,
                                precision,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async updateTokenMetadata(symbol, metadata) {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'updateMetadata',
                contractPayload: {
                    'symbol': symbol,
                    'metadata': metadata
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Update Token Metadata', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('updateMetadataSucceeded', {
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async withdrawHive(amount: string) {
        const username = this.getUser();

        const transaction_data = {
            contractName: 'hivepegged',
            contractAction: 'withdraw',
            contractPayload: {
                'quantity': formatHiveAmount(amount)
            }
        };

        if (window.hive_keychain) {
            const withdraw = await customJson(username, environment.chainId, 'Active', JSON.stringify(transaction_data), 'Withdraw HIVE');

            if (withdraw && withdraw.success && withdraw.result) {

                try {

                    const toast = new ToastMessage();

                    toast.message = this.i18n.tr('withdrawHiveSuccess', {
                        ns: 'notifications',
                        from: username,
                        to: environment.hivePegAccount,
                        amount,
                        jsonData: JSON.stringify(transaction_data)
                    });

                    this.toast.success(toast);

                    return true;
                } catch (e) {
                    const toast = new ToastMessage();

                    toast.message = this.i18n.tr('withdrawHiveError', {
                        ns: 'notifications',
                        from: username,
                        to: environment.hivePegAccount,
                        amount,
                        jsonData: JSON.stringify(transaction_data)
                    });

                    this.toast.error(toast);
                }
            }
        } else {
            hiveSignerJson(this.user.name, 'active', transaction_data, () => {
                return true;
            });
        }
    }

    depositHive(amount: string) {
        return new Promise(async (resolve) => {
            const username = this.getUser();

            const transaction_data = {
                id: environment.chainId,
                json: {
                    'contractName': 'hivepegged',
                    'contractAction': 'buy',
                    'contractPayload': {}
                }
            };

            if (window.hive_keychain) {
                const deposit = await requestTransfer(username, environment.hivePegAccount, amount, JSON.stringify(transaction_data), 'HIVE');

                if (deposit && deposit.success && deposit.result) {
                    try {
                        await checkTransaction(deposit.result.id, 3);

                        const toast = new ToastMessage();

                        toast.message = this.i18n.tr('depositHiveSuccess', {
                            from: username,
                            to: environment.hivePegAccount,
                            amount,
                            memo: JSON.stringify(transaction_data),
                            ns: 'notifications'
                        });

                        this.toast.success(toast);

                        resolve(true);
                    } catch (e) {
                        const toast = new ToastMessage();

                        toast.message = this.i18n.tr('depositHiveError', {
                            from: username,
                            to: environment.hivePegAccount,
                            amount,
                            memo: JSON.stringify(transaction_data),
                            ns: 'notifications'
                        });

                        this.toast.error(toast);

                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            } else {
                hiveSignerTransfer(username, environment.hivePegAccount, `${amount} HIVE`, JSON.stringify(transaction_data), () => {
                    resolve(true);
                });
            }
        });
    }

    async getDepositAddress(symbol) {
        const pairs = await getFormattedCoinPairs();     
        
        const peggedToken = pairs.find(p => p.symbol === symbol);

        if (!peggedToken) {
            return;
        }

        try {
            const userName = this.getUser();

            if (userName == null || userName == '') {
                throw new Error('User is unknown');
            }

            const request = await this.http.fetch(`${environment.CONVERTER_API}/convert/`, {
                method: 'POST',
                body: json({ from_coin: symbol, to_coin: peggedToken.pegged_token_symbol, destination: userName })
            });

            const response = await request.json();

            return { ...response, ...peggedToken };
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async getWithdrawalAddress(symbol, address) {
        const pairs = await getFormattedCoinPairs();

        const peggedToken = pairs.find(p => p.symbol === symbol);

        if (!peggedToken) {
            return;
        }

        try {
            const request = await this.http.fetch(`${environment.CONVERTER_API}/convert/`, {
                method: 'POST',
                body: json({ from_coin: peggedToken.pegged_token_symbol, to_coin: symbol, destination: address })
            });

            const response = await request.json();

            return { ...response, ...peggedToken };
        } catch {
            return null;
        }
    }

    async delegate(symbol: string, quantity: string, to: string): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'delegate',
                contractPayload: {
                    'to': to,
                    'symbol': symbol,
                    'quantity': quantity
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Delegate Token', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('delegateSucceeded', {
                                quantity,
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async undelegate(symbol: string, quantity: string, from: string): Promise<unknown> {
        return new Promise((resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                contractName: 'tokens',
                contractAction: 'undelegate',
                contractPayload: {
                    'from': from,
                    'symbol': symbol,
                    'quantity': quantity
                }
            };

            if (window && window.hive_keychain) {
                window.hive_keychain.requestCustomJson(username, environment.chainId, 'Active', JSON.stringify(transactionData), 'Undelegate Token', async (response) => {

                    if (response.success && response.result) {
                        try {
                            await checkTransaction(response.result.id, 3);

                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('undelegateSucceeded', {
                                quantity,
                                symbol,
                                username,
                                ns: 'notifications'
                            });

                            this.toast.success(toast);

                            resolve(true);

                            // Show 'Token successfully staked' toastr
                        } catch (e) {
                            // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                            const toast = new ToastMessage();

                            toast.message = this.i18n.tr('errorSubmittedTransfer', {
                                ns: 'errors',
                                error: e
                            });

                            this.toast.error(toast);

                            resolve(false);
                        }
                    } else {
                        resolve(false);
                        // Hide loading
                    }
                });
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    buyBEE(amount) {
        return new Promise(async (resolve) => {
            // Show loading
            const username = this.getUser();

            if (!username) {
                window.location.reload();
                return;
            }

            const transactionData = {
                id: environment.chainId,
                json: {
                    contractName: 'sscstore',
                    contractAction: 'buy',
                    contractPayload: {}
                }
            };

            if (window && window.hive_keychain) {
                const buyBeeRes = await requestTransfer(username, 'hive-engine', toFixedNoRounding(amount, 3), JSON.stringify(transactionData), 'HIVE');

                if (buyBeeRes && buyBeeRes.success && buyBeeRes.result) {
                    try {
                        await checkTransaction(buyBeeRes.result.id, 3);

                        const toast = new ToastMessage();
                        const symbol = environment.nativeToken;

                        toast.message = this.i18n.tr('buyBeeSucceeded', {                                
                            amount,
                            symbol,
                            ns: 'notifications'
                        });

                        this.toast.success(toast);

                        resolve(true);

                        // Show 'Token successfully staked' toastr
                    } catch (e) {
                        // Show error toastr: 'An error occurred attempting to enable stake token: ' + tx.error
                        const toast = new ToastMessage();

                        toast.message = this.i18n.tr('errorSubmittedTransfer', {
                            ns: 'errors',
                            error: e
                        });

                        this.toast.error(toast);

                        resolve(false);
                    }
                } else {
                    resolve(false);
                    // Hide loading
                }
                
            } else {
                hiveSignerJson(this.user.name, 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }
}
