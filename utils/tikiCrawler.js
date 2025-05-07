const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Crawls product data from Tiki and formats it according to our Product model
 */
class TikiCrawler {
  constructor() {
    this.baseUrl = 'https://tiki.vn';
    this.apiUrl = 'https://tiki.vn/api/v2/products';
    this.searchApiUrl = 'https://tiki.vn/api/v2/products';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json',
    };
    this.exportDir = path.join(__dirname, '../exports');
  }

  /**
   * Map Tiki categories to our product model categories
   * @param {string} tikiCategory - The category from Tiki
   * @returns {Object} - Mapped category and subcategory
   */
  mapCategory(tikiCategory) {
    const categoryMap = {
      'thời trang nam': { category: 'tops', gender: 'men' },
      'thời trang nữ': { category: 'tops', gender: 'women' },
      'đầm nữ': { category: 'dresses', gender: 'women' },
      'áo khoác': { category: 'outerwear', gender: 'unisex' },
      'áo sơ mi': { category: 'shirts', gender: 'unisex' },
      'áo thun': { category: 'tshirts', gender: 'unisex' },
      'áo polo': { category: 'polos', gender: 'unisex' },
      'áo len': { category: 'sweaters', gender: 'unisex' },
      'quần jean': { category: 'jeans', gender: 'unisex' },
      'quần kaki': { category: 'pants', gender: 'unisex' },
      'quần short': { category: 'shorts', gender: 'unisex' },
      'chân váy': { category: 'skirts', gender: 'women' },
      'giày': { category: 'shoes', gender: 'unisex' },
      'dép': { category: 'sandals', gender: 'unisex' },
      'túi': { category: 'bags', gender: 'unisex' },
      'túi xách': { category: 'handbags', gender: 'women' },
      'balo': { category: 'backpacks', gender: 'unisex' },
      'phụ kiện': { category: 'accessories', gender: 'unisex' },
      'đồng hồ': { category: 'watches', gender: 'unisex' },
      'thắt lưng': { category: 'belts', gender: 'unisex' },
      'mũ': { category: 'hats', gender: 'unisex' },
      'kính': { category: 'eyewear', gender: 'unisex' },
      'trang sức': { category: 'jewelry', gender: 'unisex' },
      'vest': { category: 'suits', gender: 'unisex' },
    };

    const defaultCategory = { category: 'accessories', gender: 'unisex' };
    
    if (!tikiCategory) return defaultCategory;
    
    const lowerCategory = tikiCategory.toLowerCase();
    
    let gender = 'unisex';
    if (lowerCategory.includes('nam')) gender = 'men';
    else if (lowerCategory.includes('nữ')) gender = 'women';
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return { ...value, gender: gender !== 'unisex' ? gender : value.gender };
      }
    }
    
    return defaultCategory;
  }

  /**
   * Fetch a product by its ID
   * @param {string} productId - The Tiki product ID
   * @returns {Promise<Object>} - The product data formatted for our model
   */
  async fetchProductById(productId) {
    try {
      const response = await axios.get(`${this.apiUrl}/${productId}`, { headers: this.headers });
      
      if (!response.data || response.status !== 200) {
        console.log('API failed, trying to scrape the page directly...');
        return this.scrapeProductPage(productId);
      }
      
      return this.formatProduct(response.data);
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error.message);
      console.log('Attempting to scrape product page instead...');
      return this.scrapeProductPage(productId);
    }
  }

  /**
   * Scrape product data from the HTML page as a fallback
   * @param {string} productId - The Tiki product ID
   * @returns {Promise<Object>} - The scraped product data
   */
  async scrapeProductPage(productId) {
    try {
      const response = await axios.get(`${this.baseUrl}/p/${productId}`, { 
        headers: { ...this.headers, 'Accept': 'text/html' }
      });
      
      const $ = cheerio.load(response.data);
      
      const name = $('h1.title').text().trim();
      const price = parseFloat($('div.product-price__current-price').text().replace(/[^\d]/g, ''));
      const description = $('div.ToggleContent__View-sc-1hm81e2-0').text().trim();
      const imageUrl = $('div.thumbnail img').attr('src') || '';
      const categoryText = $('ol.breadcrumb a').eq(1).text().trim();
      
      const colors = [];
      $('div.option-item').each((_, el) => {
        if ($(el).text().includes('Màu')) {
          colors.push($(el).text().trim());
        }
      });
      
      const sizes = [];
      $('div.option-item').each((_, el) => {
        const sizeText = $(el).text().trim();
        if (sizeText.match(/^(XS|S|M|L|XL|XXL)$/)) {
          sizes.push(sizeText);
        }
      });
      
      const categoryInfo = this.mapCategory(categoryText);
      
      return {
        name,
        category: categoryInfo.category,
        subCategory: categoryText || 'general',
        gender: categoryInfo.gender,
        description,
        price,
        sizes,
        colors, 
        material: '',
        occasions: this.determineOccasions({ description, category: { name: categoryText } }),
        style: this.determineStyles({ description, name }),
        imageUrl,
        inStock: true,
      };
    } catch (error) {
      console.error(`Error scraping product page ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Search for products by keyword
   * @param {string} keyword - The search keyword
   * @param {number} limit - Max number of products to return
   * @returns {Promise<Array>} - Array of products formatted for our model
   */
  async searchProducts(keyword, limit = 10) {
    try {
      const response = await axios.get(this.searchApiUrl, {
        params: {
          q: keyword,
          limit: limit * 2,
          sort: 'top_seller',
          page: 1
        },
        headers: this.headers,
      });

      if (!response.data?.data || !Array.isArray(response.data.data)) {
        console.log(`No results found for keyword: ${keyword}`);
        return [];
      }

      const products = response.data.data.slice(0, Math.min(limit * 2, response.data.data.length));
      
      const fetchPromises = products.map(item => this.fetchProductById(item.id));
      const resolvedProducts = await Promise.allSettled(fetchPromises);
      
      const validProducts = resolvedProducts
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .slice(0, limit);

      console.log(`Successfully fetched ${validProducts.length} products for keyword: ${keyword}`);
      return validProducts;
    } catch (error) {
      console.error('Error searching products:', error.message);
      return [];
    }
  }

  /**
   * Search for fashion products with category-specific enhancements
   * @param {string} category - Fashion category (e.g., "áo", "quần", "giày")
   * @param {number} limit - Max number of products to return
   * @param {boolean} exportCsv - Whether to export results to CSV
   * @returns {Promise<Array>} - Array of fashion products
   */
  async searchFashionProducts(category, limit = 10, exportCsv = false) {
    const fashionKeyword = `${category} thời trang`;
    console.log(`Searching for fashion products: ${fashionKeyword}`);
    const results = await this.searchProducts(fashionKeyword, limit);
    
    if (exportCsv && results.length > 0) {
      await this.exportToCsv(results, `fashion_${category.replace(/\s+/g, '_')}`);
    }
    
    return results;
  }
  
  /**
   * Get popular products from a specific fashion category
   * @param {string} category - Fashion category keyword
   * @param {number} limit - Number of products to retrieve
   * @param {boolean} exportCsv - Whether to export results to CSV
   * @returns {Promise<Array>} - Array of popular products
   */
  async getPopularFashionProducts(category, limit = 10, exportCsv = false) {
    try {
      const response = await axios.get(this.searchApiUrl, {
        params: {
          q: category,
          limit: limit * 2,
          sort: 'top_seller',
          aggregations: 1
        },
        headers: this.headers,
      });

      if (!response.data?.data || !Array.isArray(response.data.data)) {
        return [];
      }

      const productIds = response.data.data
        .slice(0, Math.min(limit * 2, response.data.data.length))
        .map(item => item.id);
      
      const productsPromises = productIds.map(id => this.fetchProductById(id));
      const results = await Promise.allSettled(productsPromises);
      
      const products = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .slice(0, limit);
      
      if (exportCsv && products.length > 0) {
        await this.exportToCsv(products, `popular_${category.replace(/\s+/g, '_')}`);
      }
      
      return products;
    } catch (error) {
      console.error(`Error fetching popular ${category} products:`, error.message);
      return [];
    }
  }

  /**
   * Format the Tiki product data to match our Product model
   * @param {Object} tikiProduct - Raw Tiki product data
   * @returns {Object} - Formatted product data
   */
  formatProduct(tikiProduct) {
    if (!tikiProduct) return null;

    const categoryName = tikiProduct.category?.name || 
                         tikiProduct.breadcrumbs?.[1]?.name || '';
    const categoryInfo = this.mapCategory(categoryName);
    
    const colorOptions = tikiProduct.options?.find(opt => 
      opt.name?.toLowerCase() === 'màu sắc' || opt.name?.toLowerCase() === 'color');
    const colors = colorOptions?.values?.map(v => v.label) || 
                  this.extractColorsFromDescription(tikiProduct.description) || [];
    
    const sizeOptions = tikiProduct.options?.find(opt => 
      opt.name?.toLowerCase() === 'kích cỡ' || 
      opt.name?.toLowerCase() === 'size' || 
      opt.name?.toLowerCase() === 'kích thước');
    
    const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const extractedSizes = sizeOptions?.values?.map(v => v.label) || [];
    const sizes = [...new Set(
      extractedSizes.filter(size => 
        validSizes.includes(size?.toUpperCase?.()) || 
        /^\d+(,\d+)?$/.test(size))
    )];

    const imageUrl = tikiProduct.thumbnail_url || 
                    tikiProduct.images?.[0] || 
                    tikiProduct.image || '';

    let price = tikiProduct.price || 0;
    if (typeof price === 'string') {
      price = parseFloat(price.replace(/[^\d]/g, ''));
    }

    return {
      id: tikiProduct.id || '',
      name: tikiProduct.name || '',
      category: categoryInfo.category,
      subCategory: categoryName || 'general',
      gender: categoryInfo.gender,
      description: tikiProduct.description || tikiProduct.short_description || '',
      price: price,
      sizes: sizes,
      colors: colors,
      material: tikiProduct.specifications?.find(spec => spec.name === 'Chất liệu')?.value || 
               this.extractMaterialFromDescription(tikiProduct.description) || '',
      occasions: this.determineOccasions(tikiProduct),
      style: this.determineStyles(tikiProduct),
      imageUrl: imageUrl,
      inStock: tikiProduct.inventory_status === 'available' || true,
      brand: tikiProduct.brand?.name || '',
      url: `${this.baseUrl}/p/${tikiProduct.id}`,
    };
  }

  /**
   * Extract colors from product description
   * @param {string} description - Product description
   * @returns {Array} - Extracted color names
   */
  extractColorsFromDescription(description = '') {
    if (!description) return [];
    
    const commonColors = [
      'đen', 'trắng', 'đỏ', 'xanh', 'vàng', 'tím', 'hồng', 'xám', 'nâu', 
      'cam', 'xanh dương', 'xanh lá', 'be', 'kem', 'ghi'
    ];
    
    const colors = [];
    const lowerDesc = description.toLowerCase();
    
    commonColors.forEach(color => {
      if (lowerDesc.includes(color)) {
        const formattedColor = color.charAt(0).toUpperCase() + color.slice(1);
        colors.push(formattedColor);
      }
    });
    
    return colors;
  }
  
  /**
   * Extract material information from product description
   * @param {string} description - Product description
   * @returns {string} - Extracted material info
   */
  extractMaterialFromDescription(description = '') {
    if (!description) return '';
    
    const commonMaterials = [
      'cotton', 'polyester', 'vải', 'len', 'lụa', 'da', 'nỉ', 'kaki', 
      'jean', 'denim', 'thun', 'linen', 'nhung', 'lông', 'voan', 'ren'
    ];
    
    const lowerDesc = description.toLowerCase();
    
    for (const material of commonMaterials) {
      if (lowerDesc.includes(material)) {
        const sentences = lowerDesc.split(/[.!?]+/);
        const materialSentence = sentences.find(s => s.includes(material));
        if (materialSentence) {
          const materialIndex = materialSentence.indexOf(material);
          const start = Math.max(0, materialIndex - 20);
          const end = Math.min(materialSentence.length, materialIndex + material.length + 30);
          return materialSentence.substring(start, end).trim();
        }
        return material;
      }
    }
    
    return '';
  }

  /**
   * Determine occasions based on product description and categories
   * @param {Object} tikiProduct - The Tiki product data
   * @returns {Array} - Array of occasion values
   */
  determineOccasions(tikiProduct) {
    const occasions = [];
    const description = (tikiProduct.description || '').toLowerCase();
    const categories = (tikiProduct.category?.name || '').toLowerCase();

    if (description.includes('công sở') || description.includes('văn phòng') || categories.includes('công sở')) {
      occasions.push('work');
    }
    if (description.includes('tiệc') || description.includes('party') || description.includes('dạ hội')) {
      occasions.push('party');
    }
    if (description.includes('thể thao') || description.includes('sport')) {
      occasions.push('sports');
    }
    if (description.includes('biển') || description.includes('đi chơi') || description.includes('beach')) {
      occasions.push('beach');
    }
    if (description.includes('formal') || description.includes('lịch sự')) {
      occasions.push('formal');
    }

    if (occasions.length === 0) {
      occasions.push('casual');
    }

    return occasions;
  }

  /**
   * Determine styles based on product description and categories
   * @param {Object} tikiProduct - The Tiki product data
   * @returns {Array} - Array of style values
   */
  determineStyles(tikiProduct) {
    const styles = [];
    const description = (tikiProduct.description || '').toLowerCase();
    const name = (tikiProduct.name || '').toLowerCase();

    if (description.includes('vintage') || description.includes('cổ điển') || name.includes('vintage')) {
      styles.push('vintage');
    }
    if (description.includes('classic') || description.includes('cổ điển')) {
      styles.push('classic');
    }
    if (description.includes('modern') || description.includes('hiện đại')) {
      styles.push('modern');
    }
    if (description.includes('thể thao') || description.includes('sporty')) {
      styles.push('sporty');
    }
    if (description.includes('bohemian') || description.includes('boho')) {
      styles.push('boho');
    }
    if (description.includes('minimalist') || description.includes('tối giản')) {
      styles.push('minimalist');
    }

    if (styles.length === 0) {
      styles.push('modern');
    }

    return styles;
  }

  /**
   * Export products to a CSV file
   * @param {Array} products - Array of product objects
   * @param {string} filename - Base filename (without extension)
   * @returns {Promise<string>} - Path to the created CSV file
   */
  async exportToCsv(products, filename) {
    if (!products || products.length === 0) {
      console.log('No products to export');
      return null;
    }

    try {
      if (!fs.existsSync(this.exportDir)) {
        fs.mkdirSync(this.exportDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const csvFileName = `${filename}_${timestamp}.csv`;
      const csvFilePath = path.join(this.exportDir, csvFileName);

      const csvContent = this.convertProductsToCsv(products);

      fs.writeFileSync(csvFilePath, csvContent);
      console.log(`Exported ${products.length} products to ${csvFilePath}`);

      return csvFilePath;
    } catch (error) {
      console.error('Error exporting to CSV:', error.message);
      return null;
    }
  }

  /**
   * Convert products array to CSV string
   * @param {Array} products - Array of product objects
   * @returns {string} - CSV formatted string
   */
  convertProductsToCsv(products) {
    if (!products || products.length === 0) return '';

    const headers = [
      'id', 'name', 'category', 'subCategory', 'gender', 
      'price', 'brand', 'sizes', 'colors', 'material',
      'occasions', 'style', 'inStock', 'imageUrl', 'url'
    ];

    const rows = products.map(product => headers.map(header => {
      let value = product[header];
      
      if (Array.isArray(value)) {
        value = `"${value.join(',')}"`;
      } else if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`;
      } else {
        value = String(value);
      }
      
      return value;
    }));

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

// Create and export an instance
const tikiCrawler = new TikiCrawler();
module.exports = tikiCrawler;
