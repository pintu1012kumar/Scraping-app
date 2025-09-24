import { NextResponse } from "next/server";
import puppeteer from 'puppeteer';

// In-memory cache for scraped data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// A type-safe delay function
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper function for Amazon scraping
async function scrapeAmazon(productName: string): Promise<any[]> {
    const targetUrl = `https://www.amazon.com/s?k=${encodeURIComponent(productName)}`;
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Manual check for Amazon's dynamic selectors is crucial
        const productContainerSelector = '.s-result-item[data-asin]';
        await page.waitForSelector(productContainerSelector, { timeout: 30000 });
        
        await delay(2000); 

        const products = await page.evaluate((selector) => {
            const data: any[] = [];
            const productElements = document.querySelectorAll(selector);

            productElements.forEach((el) => {
                const name = el.querySelector('h2 a span')?.textContent?.trim() || "N/A";
                const price = el.querySelector('.a-price-whole')?.textContent?.trim() || "N/A";
                const link = el.querySelector('h2 a')?.getAttribute('href');
                
                if (name !== 'N/A' && price !== 'N/A' && link) {
                    data.push({ name, price, link: "https://www.amazon.com" + link });
                }
            });
            return data;
        }, productContainerSelector);

        if (products.length === 0) {
            console.warn("No products extracted - selectors may need updating");
        }
        
        return products;
    } catch (error) {
        console.error("Amazon scraping failed:", error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

// Main API handler
export async function GET() {
    const productName = "iPhone 15"; 
    const cacheKey = `amazon-${productName}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        console.log("Serving from cache");
        return NextResponse.json({ products: cachedData.products });
    }

    try {
        const products = await scrapeAmazon(productName);
        cache.set(cacheKey, { products, timestamp: Date.now() });
        return NextResponse.json({ products });
    } catch (error: any) {
        return NextResponse.json({
            error: "Failed to fetch data.",
            details: error.message,
        }, { status: 500 });
    }
}