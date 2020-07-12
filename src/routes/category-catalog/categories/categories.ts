import { autoinject } from 'aurelia-framework';
import * as firebase from 'firebase';
import { CategoryService } from 'services/category-catalog/category-service';

@autoinject()
export class Categories {
  private level: number = 0;
  private db;
  private categories;
  private selectedId;
  private loading = false;

  constructor(private categoryService: CategoryService) { }

    async activate({ level }) {
        if (level)
            this.level = level;

        this.db = firebase.firestore();
        await this.loadCategories();
    }

  async loadCategories() {
    this.categories = await this.categoryService.getCategoriesByLevel(this.level, "orderId", true, true);
  }

  async disableCategory(catId) {
    await this.setCatEnabledDisabled(catId, false);    
  }

  async setCatEnabledDisabled(catId, enabled) {
    this.loading = true;

    let cat = await this.categoryService.getCategoryById(catId);
    cat.enabled = enabled;

    this.categoryService.updateCategory(cat);

    this.loadCategories();

    this.loading = false;
  }

  async enableCategory(catId) {
    await this.setCatEnabledDisabled(catId, true);
  }
}

