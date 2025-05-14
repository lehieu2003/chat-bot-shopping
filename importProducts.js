require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-chatbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Path to the CSV file
const csvFilePath = path.join(__dirname, '/exports/fashion_combined_cleaned.csv');

// Counter for imported products
let importedCount = 0;
let errorCount = 0;

// Check for reset flag in command line arguments
const shouldResetDatabase = process.argv.includes('--reset');

// Function to reset the database
async function resetDatabase() {
    try {
        console.log('Resetting database...');
        const result = await Product.deleteMany({});
        console.log(`Database reset complete. ${result.deletedCount} products removed.`);
        return true;
    } catch (error) {
        console.error('Error resetting database:', error.message);
        return false;
    }
}

// Function to map CSV category to schema category
function mapCategory(csvCategory, subCategory) {
    // Map based on subCategory and csvCategory
    if (subCategory.toLowerCase().includes('áo')) {
        return 'tops';
    } else if (subCategory.toLowerCase().includes('quần')) {
        return 'bottoms';
    } else if (subCategory.toLowerCase().includes('váy') || 
               subCategory.toLowerCase().includes('đầm')) {
        return 'dresses';
    } else if (subCategory.toLowerCase().includes('khoác')) {
        return 'outerwear';
    } else if (subCategory.toLowerCase().includes('giày') || 
               subCategory.toLowerCase().includes('dép')) {
        return 'shoes';
    }
    
    // Default to accessories if no match
    return 'accessories';
}

// Function to process string arrays from CSV
function processArrayField(field) {
    if (!field) return [];
    
    // Remove quotes if present
    let cleanField = field.replace(/^"|"$/g, '');
    
    // Split by comma and trim whitespace
    return cleanField.split(',').map(item => item.trim()).filter(item => item); 
}

// Function to process style field
function processStyleField(styleField) {
    const styles = processArrayField(styleField);
    return styles.map(style => style.trim());
}

// Function to process occasions field
function processOccasionsField(occasionsField) {
    const occasions = processArrayField(occasionsField);
    
    // Filter to only include valid occasions
    return occasions.map(occasion => occasion.trim());
}

// Main function to import data
async function importData() {
    // Reset database if flag is set
    if (shouldResetDatabase) {
        const resetSuccess = await resetDatabase();
        if (!resetSuccess) {
            console.error('Failed to reset database. Aborting import.');
            mongoose.connection.close();
            return;
        }
    }

    // Read and process the CSV file
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
            try {
                // Extract material information from the material field
                let materialDesc = row.material || '';
                
                // Map CSV data to Product schema
                const product = new Product({
                    name: row.name,
                    category: mapCategory(row.category, row.subCategory),
                    subCategory: row.subCategory,
                    gender: row.gender,
                    description: `${row.name}. ${materialDesc}`,  // Combine name and material for description
                    price: parseInt(row.price) || 0,
                    sizes: row.sizes ? processArrayField(row.sizes) : [],
                    colors: row.colors ? processArrayField(row.colors) : [],
                    material: materialDesc,
                    occasions: processOccasionsField(row.occasions),
                    style: processStyleField(row.style),
                    imageUrl: row.imageUrl,
                    inStock: row.inStock === 'True' || row.inStock === 'true'
                });

                // Save the product to the database
                await product.save();
                
                importedCount++;
                console.log(`Imported product: ${product.name}`);
            } catch (error) {
                errorCount++;
                console.error(`Error importing product: ${row.name}`, error.message);
            }
        })
        .on('end', () => {
            console.log(`Import completed. ${importedCount} products imported. ${errorCount} errors.`);
            
            // Close MongoDB connection after import
            setTimeout(() => {
                mongoose.connection.close();
                console.log('MongoDB connection closed.');
            }, 1000);
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            mongoose.connection.close();
        });
}

console.log(`Reading products from: ${csvFilePath}`);
if (shouldResetDatabase) {
    console.log('Reset flag detected. Will clear database before import.');
}

// Start the import process
importData();
