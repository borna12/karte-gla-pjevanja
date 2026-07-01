const axios = require("axios");
const cheerio = require("cheerio");

async function scrape() {
    try {
        const response = await axios.get("https://stin.hr/repozitorij-glagoljaskoga-pjevanja/");
        const $ = cheerio.load(response.data);
        
        $("a").each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr("href");
            if (href && text.toLowerCase().includes("knjiga 2")) {
                console.log(text, "->", href);
            }
        });
    } catch(e) {}
}
scrape();
