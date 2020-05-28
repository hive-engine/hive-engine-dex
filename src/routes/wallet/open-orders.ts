import { getUserOpenOrders, cancelMarketOrder } from 'common/market';
import { HiveEngine } from 'services/hive-engine';
import { autoinject } from 'aurelia-framework';

@autoinject()
export class OpenOrders {
    private loadingOpenOrders = false;
    private orders = [];

    private openOrdersTable: HTMLTableElement;
    
    constructor(private se: HiveEngine) {

    }

    attached() {
        this.loadTable();
    }

    loadTable() {
        // @ts-ignore
        $(this.openOrdersTable).DataTable({
            "columnDefs": [
                { "targets": 0, "responsivePriority": 1 }, // Symbol
                { "targets": 1, "responsivePriority": 2 }, // Price (Hive)
                { "targets": 2, "responsivePriority": 3 }, // Quantity
                { "targets": 3, "responsivePriority": 10000 }, // Total (Hive)
                { "targets": 4, "responsivePriority": 10010 }, // Date
                { "targets": 5, "responsivePriority": 4 }, // Actions
            ],
            bInfo: false,
            paging: false,
            searching: false,
            responsive: true
        });
    }

    async canActivate() {
        this.loadingOpenOrders = true;

        try {            
            this.orders = await getUserOpenOrders(this.se.getUser());
        } catch {
            return false;
        } finally {
            this.loadingOpenOrders = false;
        }
    }

    async cancelOrder(type: string, txId: string, symbol: string) {
        await cancelMarketOrder(this.se.getUser(), type, txId, symbol);
    }
}
