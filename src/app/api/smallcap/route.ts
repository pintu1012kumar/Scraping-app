import { NextResponse } from "next/server";
import puppeteer from 'puppeteer';

// In-memory cache for scraped data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// A type-safe delay function to replace waitForTimeout
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper function for retry logic
async function scrapeWithRetry(targetUrl: string, retries: number = 3): Promise<any[]> {
    for (let i = 0; i < retries; i++) {
        let browser = null;
        try {
            browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();

            await page.goto(targetUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Wait for a more reliable selector or fallback
            await page.waitForSelector('div[data-id]', { timeout: 30000 });

            // Use the type-safe delay function here
            console.log("Adding a 2-second delay to observe scraping...");
            await delay(2000);

            const products = await page.evaluate(() => {
                const data: any[] = [];
                const productElements = document.querySelectorAll('div[data-id]'); // Use reliable selector

                // Debug: Log the number of elements found
                console.log(`Found ${productElements.length} product elements`);

                // Debug: Log the HTML structure
                console.log('HTML snippet:', document.body.innerHTML.substring(0, 1000));

                productElements.forEach((el) => {
                    // Updated selectors based on actual HTML structure
                    const name = el.querySelector('div.KzDlHZ, div._4rR01T')?.textContent?.trim() || "N/A";
                    const price = el.querySelector('div.Nx9bqj, div._30jeq3')?.textContent?.trim() || "N/A";
                    const link = el.querySelector('a.CGtC98')?.getAttribute('href');
                    const rating = el.querySelector('div.XQDdHH, div._3LWZlK')?.textContent?.trim() || 'N/A';

                    if (name !== 'N/A' && price !== 'N/A' && link) {
                        data.push({
                            name,
                            price,
                            link: "https://www.flipkart.com" + link,
                            rating
                        });
                    }
                });

                // Debug: Log the extracted data
                console.log('Extracted products:', data);
                // Print each product in terminal
                data.forEach((product, index) => {
                    console.log(`Product ${index + 1}:`, product);
                });
                return data;
            });

            // If no products found, log a warning
            if (products.length === 0) {
                console.warn("No products extracted - selectors may need updating");
            }

            return products;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Exponential backoff
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    return [];
}

export async function GET() {
    const targetUrl = "https://www.flipkart.com/search?q=iphone";
    const cacheKey = targetUrl;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        console.log("Serving from cache");
        return NextResponse.json({ products: cachedData.products });
    }

    const startTime = Date.now();

    try {
        const products = await scrapeWithRetry(targetUrl, 3);

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Scraping completed in ${duration}ms, products found: ${products.length}`);

        // Print products in terminal
        console.log('Final products data:');
        products.forEach((product, index) => {
            console.log(`Product ${index + 1}:`, JSON.stringify(product, null, 2));
        });

        // Cache the result
        cache.set(cacheKey, { products, timestamp: Date.now() });

        return NextResponse.json({ products });
    } catch (error: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.error(`Scraping failed after ${duration}ms:`, error.message);

        return NextResponse.json({
            error: "Failed to fetch data.",
            details: error.message,
            duration: `${duration}ms`
        }, { status: 500 });
    }
}