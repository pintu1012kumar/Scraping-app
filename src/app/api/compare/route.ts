import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import * as fuzzball from "fuzzball";


interface Product {
  name: string;
  price: string;
  link: string;
  priceValue: number;
}

const randomizedDelay = (min: number, max: number) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((res) => setTimeout(res, ms));
};

function cleanPrice(price: string): number {
  if (!price) return 0;
  const num = price.replace(/[^\d]/g, "");
  return parseFloat(num) || 0;
}

async function scrapeFlipkart(productName: string): Promise<Product[]> {
  const targetUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(
    productName
  )}`;
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("div[data-id]", { timeout: 30000 });
    await randomizedDelay(1000, 3000);

    const products = await page.evaluate(() => {
      const res: any[] = [];
      document.querySelectorAll("div[data-id]").forEach((el) => {
        const name =
          el.querySelector("div.KzDlHZ, div._4rR01T")?.textContent?.trim() ||
          "N/A";
        const price =
          el.querySelector("div.Nx9bqj, div._30jeq3")?.textContent?.trim() ||
          "N/A";
        const aTag = el.querySelector("a.CGtC98, a._1fQZEK");
        const link = aTag ? aTag.getAttribute("href") : null;
        if (name !== "N/A" && price !== "N/A" && link) {
          res.push({ name, price, link: "https://www.flipkart.com" + link });
        }
      });
      return res;
    });

    return products.map((p) => ({
      ...p,
      priceValue: cleanPrice(p.price),
    })) as Product[];
  } catch (err) {
    console.error("Error in scrapeFlipkart:", err);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeCroma(productName: string): Promise<Product[]> {
  const targetUrl = `https://www.croma.com/searchB?q=${encodeURIComponent(
    productName
  )}%3Arelevance&text=${encodeURIComponent(productName)}`;
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36"
    );

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    try {
      await page.waitForSelector("input#locationInput", { timeout: 5000 });
      await page.type("input#locationInput", "110001", { delay: 100 });
      await page.click("button[data-testid='locationApplyBtn']");

      await randomizedDelay(3000, 4000);
    } catch {
      console.log("No location popup on Croma");
    }

    await page.waitForSelector("div.cp-product", { timeout: 30000 });
    await randomizedDelay(1500, 4000);

    const products = await page.evaluate(() => {
      const res: any[] = [];
      document.querySelectorAll("div.cp-product").forEach((el) => {
        const name =
          el.querySelector(".product-title")?.textContent?.trim() || "N/A";
        const price =
          el.querySelector(".amount")?.textContent?.trim() || "N/A";
        const aTag = el.querySelector("a");
        const link = aTag ? aTag.getAttribute("href") : null;
        if (name !== "N/A" && price !== "N/A" && link) {
          const fullLink = link.startsWith("http")
            ? link
            : "https://www.croma.com" + link;
          res.push({ name, price, link: fullLink });
        }
      });
      return res;
    });

    return products.map((p) => ({
      ...p,
      priceValue: cleanPrice(p.price),
    })) as Product[];
  } catch (err) {
    console.error("Error in scrapeCroma:", err);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}


export async function GET() {
  const defaultSearch = "iPhone 16";
  const start = Date.now();
  try {
    const flipkartItems = await scrapeFlipkart(defaultSearch);
    const cromaItems = await scrapeCroma(defaultSearch);

    // fuzzy matching
    const matches: any[] = [];
    flipkartItems.forEach((fk) => {
      let bestMatch: Product | null = null;
      let bestScore = 0;

      cromaItems.forEach((cr) => {
        const score = fuzzball.token_set_ratio(fk.name, cr.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = cr;
        }
      });

      if (bestMatch && bestScore > 80) {
        const diff = fk.priceValue - bestMatch.priceValue;
        matches.push({
          flipkart: fk,
          croma: bestMatch,
          score: bestScore,
          difference: diff,
          cheaper: diff > 0 ? "Croma" : diff < 0 ? "Flipkart" : "Same price",
        });
      }
    });

    const duration = Date.now() - start;
    return NextResponse.json({
      searched: defaultSearch,
      comparisons: matches,
      duration: `${duration}ms`,
    });
  } catch (err: any) {
    const duration = Date.now() - start;
    return NextResponse.json(
      {
        error: "Comparison failed",
        message: err.message,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
