import { customElement, bindable } from 'aurelia-framework';

@customElement('balances')
export class Balances {    
    @bindable deposit;
    @bindable data;
    @bindable hivepBalance;
    @bindable tokenBalance;
}
