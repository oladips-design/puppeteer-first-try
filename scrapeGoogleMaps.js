const cheerio = require("cheerio");
const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

async function searchGoogleMaps() {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false,
      // headless: "new",
      // devtools: true,
      executablePath: "", // your path here
    });

    // const browser = await puppeteerExtra.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: "new",
    //   ignoreHTTPSErrors: true,
    // });

    const page = await browser.newPage();

    const query = "Pizza shops Lagos";
    // const query = "shawarma Lagos";

    try {
      await page.goto(
        `https://www.google.com/maps/search/${query.split(" ").join("+")}`
      );
    } catch (error) {
      console.log("error going to page");
    }

    // this function ensures we get all the extra content as they load dynamically
    async function autoScroll(page) {
      await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');

        await new Promise((resolve, reject) => {
          let totalHeight = 0;
          let distance = 1000;
          let scrollDelay = 3000;

          let timer = setInterval(async () => {
            let scrollHeightBefore = wrapper.scrollHeight;
            wrapper.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeightBefore) {
              totalHeight = 0;
              await new Promise((resolve) => setTimeout(resolve, scrollDelay));

              // Calculate scrollHeight after waiting
              let scrollHeightAfter = wrapper.scrollHeight;

              if (scrollHeightAfter > scrollHeightBefore) {
                // More content loaded, keep scrolling
                return;
              } else {
                // No more content loaded, stop scrolling
                clearInterval(timer);
                resolve();
              }
            }
          }, 200);
        });
      });
    }

    await autoScroll(page);

    const html = await page.content();
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));

    await browser.close();
    console.log("browser closed");

    // get all a tag parent where a tag href includes /maps/place/
    const $ = cheerio.load(html);
    const aTags = $("a");
    const parents = [];
    aTags.each((i, el) => {
      const href = $(el).attr("href");
      if (!href) {
        return;
      }
      if (href.includes("/maps/place/")) {
        parents.push($(el).parent());
      }
    });

    console.log("parents", parents.length);

    const buisnesses = [];

    parents.forEach((parent) => {
      const url = parent.find("a").attr("href");
      // get a tag where data-value="Website"
      const website = parent.find('a[data-value="Website"]').attr("href");
      // find a div that includes the class fontHeadlineSmall
      const storeName = parent.find("div.fontHeadlineSmall").text();
      // find span that includes class fontBodyMedium
      const ratingText = parent
        .find("span.fontBodyMedium > span")
        .attr("aria-label");

      // get the first div that includes the class fontBodyMedium
      const bodyDiv = parent.find("div.fontBodyMedium").first();
      const children = bodyDiv.children();
      const lastChild = children.last();
      const firstOfLast = lastChild.children().first();
      const lastOfLast = lastChild.children().last();

      buisnesses.push({
        placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
        address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
        category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
        phone: lastOfLast?.text()?.split("·")?.[1]?.trim(),
        googleUrl: url,
        bizWebsite: website,
        storeName,
        ratingText,
        stars: ratingText?.split("stars")?.[0]?.trim()
          ? Number(ratingText?.split("stars")?.[0]?.trim())
          : null,
        numberOfReviews: ratingText
          ?.split("stars")?.[1]
          ?.replace("Reviews", "")
          ?.trim()
          ? Number(
              ratingText?.split("stars")?.[1]?.replace("Reviews", "")?.trim()
            )
          : null,
      });
    });
    const end = Date.now();

    console.log(`time in seconds ${Math.floor((end - start) / 1000)}`);
    fs.writeFile("google.json", JSON.stringify(buisnesses), (err) => {
      if (err) throw err;
      console.log("done scraping");
    });

    return buisnesses;
  } catch (error) {
    console.log("error at googleMaps", error.message);
  }
}

searchGoogleMaps();
