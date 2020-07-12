import { PLATFORM } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';

export class AdminAdmin {
    private router: Router;
    
    public configureRouter(config: RouterConfiguration, router: Router) {
        config.map([
            {
                route: ['', 'home'],
                name: 'adminHome',
                moduleId: PLATFORM.moduleName('./home'),
                nav: true,
                title: 'Home'
            },
            {
                route: 'kyc',
                name: 'adminKyc',
                moduleId: PLATFORM.moduleName('./kyc/kyc'),
                nav: true,
                title: 'Kyc'
            },
            {
                route: 'residency',
                name: 'adminResidency',
                moduleId: PLATFORM.moduleName('./residency/residency'),
                nav: true,
                title: 'Residency'
            },
            {
                route: 'users',
                name: 'adminUsers',
                moduleId: PLATFORM.moduleName('./users/users'),
                nav: true,
                title: 'Users'
            },
            {
                route: 'tokens',
                name: 'adminTokens',
                moduleId: PLATFORM.moduleName('./tokens'),
                nav: true,
                title: 'Tokens'
            },
            { route: 'category-catalog/categories/:level?', moduleId: PLATFORM.moduleName('./category-catalog/categories/categories', 'categories'), name: 'categories', nav: false },
            { route: 'category-catalog/edit-category/:id', moduleId: PLATFORM.moduleName('./category-catalog/categories/edit-category', 'edit-category'), name: 'edit-category', nav: false },
            { route: 'category-catalog/add-category', title: 'Add category', moduleId: PLATFORM.moduleName('./category-catalog/categories/add-category', 'add-category'), name: 'add-category', nav: true },
            { route: 'category-catalog/category-proposals', title: 'Category proposals', moduleId: PLATFORM.moduleName('./category-catalog/proposals/category-proposals', 'category-proposals'), name: 'category-proposals', nav: true },
            { route: 'category-catalog/add-category-proposal', title: 'Propose category', moduleId: PLATFORM.moduleName('./category-catalog/proposals/add-category-proposal', 'add-category-proposal'), name: 'add-category-proposal', nav: true }      
        ]);

        this.router = router;
    }
}
