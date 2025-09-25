import { NextResponse } from "next/server";
import puppeteer from 'puppeteer-core';
import chromium from "@sparticuz/chromium";

// In-memory cache for scraped data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// A type-safe delay function to replace waitForTimeout
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Define the interface for the scraped product data
interface ScrapedProduct {
    name: string;
    price: string;
    link: string;
    rating: string;
}

// Helper function for retry logic
async function scrapeWithRetry(targetUrl: string, retries: number = 3): Promise<ScrapedProduct[]> {
    for (let i = 0; i < retries; i++) {
        let browser = null;
        try {
            browser = await puppeteer.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
            });
            const page = await browser.newPage();

            await page.goto(targetUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            await page.waitForSelector('div[data-id]', { timeout: 30000 });

            console.log("Adding a 2-second delay to observe scraping...");
            await delay(2000);

            const products = await page.evaluate(() => {
                // Use a strongly typed array
                const data: ScrapedProduct[] = [];
                const productElements = document.querySelectorAll('div[data-id]');

                console.log(`Found ${productElements.length} product elements`);
                console.log('HTML snippet:', document.body.innerHTML.substring(0, 1000));

                productElements.forEach((el) => {
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

                console.log('Extracted products:', data);
                data.forEach((product, index) => {
                    console.log(`Product ${index + 1}:`, product);
                });
                return data;
            });

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

        console.log('Final products data:');
        products.forEach((product, index) => {
            console.log(`Product ${index + 1}:`, JSON.stringify(product, null, 2));
        });

        cache.set(cacheKey, { products, timestamp: Date.now() });

        return NextResponse.json({ products });
    } catch (error: unknown) { // Use 'unknown' instead of 'any'
        const endTime = Date.now();
        const duration = endTime - startTime;
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error(`Scraping failed after ${duration}ms:`, errorMessage);

        return NextResponse.json({
            error: "Failed to fetch data.",
            details: errorMessage,
            duration: `${duration}ms`
        }, { status: 500 });
    }
}