import { MarketService } from './../../services/market-service';
import { checkTransaction } from 'common/hive-engine';
import { sleep } from 'common/functions';
import { loading } from 'store/actions';
import { dispatchify } from 'aurelia-store';
import { DialogController } from 'aurelia-dialog';
import { autoinject, useView, PLATFORM } from 'aurelia-framework';

@autoinject()
@useView(PLATFORM.moduleName('modals/nft/nft-change-price.html'))
export class NftChangeSellPriceModal {
    private symbol;
    private nftId;
    private price;
    private priceSymbol;
    private user;
    private errors: string[] = [];

    constructor(private controller: DialogController, private marketService: MarketService) {
        this.controller.settings.lock = false;
        this.controller.settings.centerHorizontalOnly = true;
    }

    activate({order, symbol}) {
        this.symbol = symbol;
        this.nftId = order.nftId;
        this.price = order.price;
    }

    async changePrice() {
        dispatchify(loading)(true);

        try {
            const response = await this.marketService.changePrice(this.symbol, this.nftId, this.price) as any;

            if (response.success) {
                try {
                    const verify = await checkTransaction(response.result.id, 3);
                    
                    if (verify?.errors) {
                        this.errors = verify.errors;
                    } else {
                        await sleep(3200);

                        this.controller.ok();
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            dispatchify(loading)(false);
        } catch {
            dispatchify(loading)(false);
        }
    }
}
