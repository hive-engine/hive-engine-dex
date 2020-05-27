import { hiveSignerJson } from 'common/hive';
import { customJson } from 'common/keychain';
import { autoinject } from 'aurelia-framework';
import { HiveEngine } from 'services/hive-engine';

import { environment } from 'environment';

@autoinject()
export class MarketService {
    constructor(private se: HiveEngine) {

    }

    async buy(symbol: string, nftId: string): Promise<HiveKeychain.HiveKeyChainResponse | boolean>  {
        return new Promise((resolve) => {
            const transactionData = {
                contractName: 'nftmarket',
                contractAction: 'buy',
                contractPayload: {
                    symbol: symbol,
                    nfts: [`${nftId}`],
                    marketAccount: 'se-devworks'
                }
            };
    
            if (window.hive_keychain) {
                return resolve(customJson(this.se.getUser(), environment.chainId, 'Active', JSON.stringify(transactionData), `Place buy order`));
            } else {
                hiveSignerJson(this.se.getUser(), 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }
    
    async sell(symbol: string, nftId: string, price: string, priceSymbol: string, ): Promise<HiveKeychain.HiveKeyChainResponse | boolean>  {
        return new Promise((resolve) => {
            const transactionData = {
                contractName: 'nftmarket',
                contractAction: 'sell',
                contractPayload: {
                    symbol: symbol,
                    nfts: [`${nftId}`],
                    price: price,
                    priceSymbol: priceSymbol,
                    fee: 500
                }
            };
    
            if (window.hive_keychain) {
                return resolve(customJson(this.se.getUser(), environment.chainId, 'Active', JSON.stringify(transactionData), `Place sell order`));
            } else {
                hiveSignerJson(this.se.getUser(), 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }
    
    async changePrice(symbol: string, nftId: string, price: string ): Promise<HiveKeychain.HiveKeyChainResponse | boolean>  {
        return new Promise((resolve) => {
            const transactionData = {
                contractName: 'nftmarket',
                contractAction: 'changePrice',
                contractPayload: {
                    symbol: symbol,
                    nfts: [`${nftId}`],
                    price: price
                }
            };
    
            if (window.hive_keychain) {
                return resolve(customJson(this.se.getUser(), environment.chainId, 'Active', JSON.stringify(transactionData), `Change sell price`));
            } else {
                hiveSignerJson(this.se.getUser(), 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }

    async cancel(symbol: string, nftId: string): Promise<HiveKeychain.HiveKeyChainResponse | boolean>  {
        return new Promise((resolve) => {
            const transactionData = {
                contractName: 'nftmarket',
                contractAction: 'cancel',
                contractPayload: {
                    symbol: symbol,
                    nfts: [`${nftId}`]
                }
            };
    
            if (window.hive_keychain) {
                return resolve(customJson(this.se.getUser(), environment.chainId, 'Active', JSON.stringify(transactionData), `Cancel order`));
            } else {
                hiveSignerJson(this.se.getUser(), 'active', transactionData, () => {
                    resolve(true);
                });
            }
        });
    }
}
