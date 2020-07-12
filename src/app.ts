import { CallingAction, MiddlewarePlacement } from 'aurelia-store';
/* eslint-disable no-undef */
import { AuthorizeStep } from './resources/pipeline-steps/authorize';
import { HiveEngine } from 'services/hive-engine';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Store, dispatchify } from 'aurelia-store';
import { environment } from './environment';
import { PostRenderStep } from './resources/pipeline-steps/postrender';
import { PreRenderStep } from './resources/pipeline-steps/prerender';
import { MaintenanceStep } from './resources/pipeline-steps/maintenance';
import { PLATFORM } from 'aurelia-pal';
import { Router, RouterConfiguration, RouterEvent } from 'aurelia-router';
import { autoinject } from 'aurelia-framework';

import { getCurrentFirebaseUser, markNotificationsRead } from 'store/actions';

import './common/custom-validation-rules';

function lastCalledActionMiddleware(state: State, originalState: State, settings = {}, action: CallingAction) {
    state.$action = {
        name: action.name,
        params: action.params ?? {},
    };

    return state;
}

@autoinject()
export class App {
    private loggedIn = false;
    private loading = false;
    private claims;
    private notifications = [];

    public router: Router;
    public subscription: Subscription;
    private state: State;

    constructor(
        private ea: EventAggregator,
        private store: Store<State>,
        private se: HiveEngine
    ) {
        this.store.registerMiddleware(lastCalledActionMiddleware, MiddlewarePlacement.After);
    }

    bind() {
        this.store.state.subscribe((s: State) => {
            if (s) {
                this.state = s;

                this.loading = s.loading;
                this.loggedIn = s.loggedIn;
                this.claims = s?.account?.token?.claims;
                this.notifications = s?.firebaseUser?.notifications ?? [];
            }
        });

        this.subscription = this.ea.subscribe(RouterEvent.Complete, () => {
            dispatchify(getCurrentFirebaseUser)();
            dispatchify(markNotificationsRead)();
        });
    }

    public configureRouter(config: RouterConfiguration, router: Router) {
        config.title = environment.siteName;

        MaintenanceStep.inMaintenance = environment.maintenanceMode;

        config.options.pushState = true;

        config.addPipelineStep('authorize', AuthorizeStep);
        config.addPipelineStep('authorize', MaintenanceStep);
        config.addPipelineStep('preRender', PreRenderStep);
        config.addPipelineStep('postRender', PostRenderStep);

        config.map([
            {
                route: ['', 'home'],
                name: 'home',
                moduleId: PLATFORM.moduleName('./routes/home'),
                nav: false,
                title: 'Home',
            },
            {
                route: 'maintenance',
                name: 'maintenance',
                moduleId: PLATFORM.moduleName('./routes/maintenance'),
                nav: false,
                title: 'We will be right back...',
            },
            {
                route: 'wallet',
                name: 'wallet',
                moduleId: PLATFORM.moduleName('./routes/wallet/wallet'),
                auth: true,
                nav: false,
                title: 'Wallet',
            },
            {
                route: 'offerings',
                name: 'offerings',
                moduleId: PLATFORM.moduleName('./routes/offerings'),
                nav: 3,
                title: 'Offerings',
            },
            {
                route: 'tokens',
                name: 'tokens',
                moduleId: PLATFORM.moduleName('./routes/tokens/tokens'),
                nav: 0,
                title: 'Tokens',
            },
            {
                route: 'token-history/:symbol?',
                href: `token-history/${environment.nativeToken}`,
                name: 'token-history',
                moduleId: PLATFORM.moduleName('./routes/wallet/token-history'),
                nav: false,
                title: 'Token History',
            },
            {
                route: 'pending-undelegations',
                href: `pending-undelegations`,
                name: 'pending-undelegations',
                moduleId: PLATFORM.moduleName('./routes/wallet/pending-undelegations'),
                nav: false,
                title: 'Pending undelegations',
            },
            {
                route: 'pending-unstakes',
                href: `pending-unstakes`,
                name: 'pending-unstakes',
                moduleId: PLATFORM.moduleName('./routes/wallet/pending-unstakes',),
                nav: false,
                title: 'Pending unstakes',
            },
            {
                route: 'exchange/:symbol?',
                href: `exchange/${environment.nativeToken}`,
                name: 'exchange',
                moduleId: PLATFORM.moduleName('./routes/exchange/exchange'),
                nav: 1,
                title: 'Exchange',
            },
            {
                route: 'faq',
                name: 'faq',
                moduleId: PLATFORM.moduleName('./routes/faq'),
                nav: 4,
                title: 'Faq',
            },
            {
                route: 'rewards',
                name: 'rewards',
                moduleId: PLATFORM.moduleName('./routes/account/rewards'),
                nav: false,
                auth: true,
                title: 'Rewards',
            },
            {
                route: 'conversion-history',
                name: 'conversionHistory',
                moduleId: PLATFORM.moduleName('./routes/account/conversion-history'),
                nav: false,
                auth: true,
                title: 'Conversion History',
            },
            {
                route: 'account-history/:symbol?',
                name: 'accountHistory',
                moduleId: PLATFORM.moduleName('./routes/account/account-history'),
                nav: false,
                auth: true,
                title: 'Account History',
            },
            {
                route: 'settings',
                name: 'settings',
                moduleId: PLATFORM.moduleName('./routes/account/settings'),
                nav: false,
                auth: true,
                title: 'Settings',
            },
            {
                route: 'tribes',
                name: 'tribes',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/tribes'),
                nav: false,
                title: 'Tribes',
            },
            {
                route: 'advertise-tribe',
                name: 'advertise-tribe',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/advertise-tribe'),
                nav: false,
                title: 'Advertise Tribe',
            },
            {
                route: 'legal-services',
                name: 'legal-services',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/legal-services'),
                nav: false,
                title: 'Legal Services',
            },
            {
                route: 'crowdfunding',
                name: 'crowdfunding',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/crowdfunding'),
                nav: false,
                title: 'Crowdfunding',
            },
            {
                route: 'state-costs',
                name: 'state-costs',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/state-costs'),
                nav: false,
                title: 'State Costs',
            },
            {
                route: 'scotbot',
                name: 'scotbot',
                moduleId: PLATFORM.moduleName('./routes/offering-routes/scotbot'),
                nav: false,
                title: 'Scotbot',
            },
            {
                route: 'admin',
                name: 'admin',
                moduleId: PLATFORM.moduleName('./routes/admin/admin'),
                nav: true,
                auth: true,
                title: 'Admin',
                settings: {
                    roles: ['super', 'admin'],
                },
            },
            {
                route: 'crowdfunding-options',
                name: 'crowdfunding-options',
                moduleId: PLATFORM.moduleName(
                    './routes/offering-routes/crowdfunding/crowdfunding-options'
                ),
                nav: false,

                title: 'Crowdfunding Options',
            },
            {
                route: 'crowdfunding-create',
                name: 'crowdfunding-create',
                moduleId: PLATFORM.moduleName(
                    './routes/offering-routes/crowdfunding/crowdfunding-create'
                ),
                nav: false,
                title: 'Crowdfunding Create',
            },
            {
                route: 'crowdfunding-back',
                name: 'crowdfunding-back',
                moduleId: PLATFORM.moduleName(
                    './routes/offering-routes/crowdfunding/crowdfunding-back'
                ),
                nav: false,
                title: 'Crowdfunding Back',
            },
            {
                route: 'crowdfunding-how',
                name: 'crowdfunding-how',
                moduleId: PLATFORM.moduleName(
                    './routes/offering-routes/crowdfunding/crowdfunding-how'
                ),
                nav: false,
                title: 'Crowdfunding How',
            },
            {
                route: 'create-token',
                name: 'createToken',
                moduleId: PLATFORM.moduleName('./routes/create-token'),
                nav: false,
                title: 'Create Token',
            },
            {
                route: 'crowdfunding-explore',
                name: 'crowdfunding-explore',
                moduleId: PLATFORM.moduleName(
                    './routes/offering-routes/crowdfunding/crowdfunding-explore'
                ),
                nav: false,
                title: 'Crowdfunding Explore',
            },
            {
                route: 'nfts',
                name: 'nfts',
                moduleId: PLATFORM.moduleName('./routes/nfts/nfts'),
                nav: environment.features.nfts.enabled ? 2 : false,
                title: 'NFTs',
            },
            {
                route: 'nft/:symbol',
                name: 'nft',
                moduleId: PLATFORM.moduleName('./routes/nfts/nft'),
                nav: false,
                title: 'NFT',
            },
            {
                route: 'nft/issue/:symbol',
                name: 'nftIssue',
                moduleId: PLATFORM.moduleName('./routes/nfts/issue'),
                nav: false,
                title: 'Issue NFT',
            },
            {
                route: 'nft/properties/:symbol',
                name: 'nftProperties',
                moduleId: PLATFORM.moduleName('./routes/nfts/properties'),
                nav: false,
                title: 'Add properties to NFT',
            },
            {
                route: 'nft/showroom',
                name: 'nft-showroom',
                moduleId: PLATFORM.moduleName('./routes/nfts/nft-showroom/nft-showroom'),
                nav: false,
                title: 'NFT Showroom',
            },
            {
                route: 'nft/showroom/detail/:symbol/:id?',
                name: 'nft-detail',
                moduleId: PLATFORM.moduleName('./routes/nfts/nft-detail/nft-detail'),
                nav: false,
                title: 'NFT Detail',
            },
            {
                route: 'nft/home',
                name: 'nft-home',
                moduleId: PLATFORM.moduleName('./routes/nfts/nft-home'),
                nav: false,
                title: 'NFTs Home',
            },
            {
                route: 'create-nft',
                name: 'createNft',
                moduleId: PLATFORM.moduleName('./routes/nfts/create'),
                nav: false,
                title: 'Create NFT',
            },
            {
                route: 'create-nft-options',
                name: 'createNftOptions',
                moduleId: PLATFORM.moduleName('./routes/nfts/create-options'),
                nav: false,
                title: 'Create NFT Options',
            },
            {
                route: 'user-actions',
                name: 'userActions',
                moduleId: PLATFORM.moduleName('./routes/nfts/create-nft-user/user-actions'),
                nav: false,
                title: 'Create User Actions',
            },
            {
                route: 'add-personal-details',
                name: 'personalDetails',
                moduleId: PLATFORM.moduleName(
                    './routes/nfts/create-nft-user/add-personal-details'
                ),
                nav: false,
                title: 'Add Personal Details',
            },
            {
                route: 'create-profiles',
                name: 'createProfiles',
                moduleId: PLATFORM.moduleName(
                    './routes/nfts/create-nft-user/profiles/create-profiles'
                ),
                nav: false,
                title: 'Create Profiles',
            },
            {
                route: 'add-group-details',
                name: 'groupDetails',
                moduleId: PLATFORM.moduleName('./routes/nfts/create-nft-user/add-group-details'),
                nav: false,
                title: 'Add Group Details',
            },
            {
                route: 'add-opportunity',
                name: 'addOpportunity',
                moduleId: PLATFORM.moduleName('./routes/nfts/create-nft-user/add-opportunity'),
                nav: false,
                title: 'Add Opportunity',
            },
            {
                route: 'create-nft-user',
                name: 'createNftUser',
                moduleId: PLATFORM.moduleName('./routes/nfts/create-nft-user/create-nft-user'),
                nav: false,
                title: 'Create NFT User',
            },
            {
                route: 'nft-user-showroom',
                name: 'nftUserShowroom',
                moduleId: PLATFORM.moduleName('./routes/nfts/nft-user-showroom/nft-user-showroom'),
                nav: false,
                title: 'User Showroom',
            },
            {
                route: 'edit-nft/:symbol',
                name: 'editNft',
                moduleId: PLATFORM.moduleName('./routes/nfts/edit'),
                nav: false,
                title: 'Edit NFT',
            },
            { route: 'category-catalog/categories/:level?', moduleId: PLATFORM.moduleName('./routes/category-catalog/categories/categories', 'categories'), name: 'categories', nav: false },
            { route: 'category-catalog/edit-category/:id', moduleId: PLATFORM.moduleName('./routes/category-catalog/categories/edit-category', 'edit-category'), name: 'edit-category', nav: false },
            { route: 'category-catalog/add-category', title: 'Add category', moduleId: PLATFORM.moduleName('./routes/category-catalog/categories/add-category', 'add-category'), name: 'add-category', nav: true },
            { route: 'category-catalog/category-proposals', title: 'Category proposals', moduleId: PLATFORM.moduleName('./routes/category-catalog/proposals/category-proposals', 'category-proposals'), name: 'category-proposals', nav: true },
            { route: 'category-catalog/add-category-proposal', title: 'Propose category', moduleId: PLATFORM.moduleName('./routes/category-catalog/proposals/add-category-proposal', 'add-category-proposal'), name: 'add-category-proposal', nav: true }      
        ]);

        this.router = router;
    }
}
