const axios = require("axios");
const cheerio = require("cheerio");

async function scrape() {
    try {
        const response = await axios.get("https://stin.hr/repozitorij-glagoljaskoga-pjevanja/");
        const $ = cheerio.load(response.data);
        
        // Find links
        const links = [];
        $("a").each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr("href");
            if (href && (text.toLowerCase().includes("cd") || href.toLowerCase().includes("cd"))) {
                links.push({ text, href });
            }
        });
        
        console.log("Found CD links:", links.length);
        console.log(links.slice(0, 20));
    } catch (e) {
        console.error(e.message);
    }
}
scrape();
