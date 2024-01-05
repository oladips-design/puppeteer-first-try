const puppeteer = require("puppeteer");
const fs = require("fs");
const cheerio = require("cheerio");

const url = "https://books.toscrape.com";

const main = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);

  // Get the HTML content of the page
  const content = await page.content();

  // Use Cheerio to parse the HTML
  const $ = cheerio.load(content);

  // use Cheerio to select elements
  const bookData = $(".product_pod")
    .map((index, element) => ({
      title: $(element).find("h3 a").attr("title"),
      price: $(element).find(".price_color").text(),
      imgSrc: url + $(element).find("img").attr("src"),
      rating: $(element).find(".star-rating").attr("class").split(" ")[1],
    }))
    .get();

  console.log(bookData);
  await browser.close();

  //   fs.writeFile("scraped.json", JSON.stringify(bookData), (err) => {
  //     if (err) throw err;
  //     console.log("done scraping");
  //   });
};

main();
