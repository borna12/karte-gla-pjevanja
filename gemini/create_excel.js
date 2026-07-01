const XLSX = require("xlsx");
const fs = require("fs");

try {
    // Pročitaj CSV datoteke kao string da osiguramo točan UTF-8 (uključujući BOM ako ga ima)
    const csv1Str = fs.readFileSync("glagoljasko_pjevanje_lokacije.csv", "utf8");
    const csv2Str = fs.readFileSync("locations_extracted.csv", "utf8");

    // Pretvori string u radne listove
    const wb1 = XLSX.read(csv1Str, { type: "string" });
    const ws1 = wb1.Sheets[wb1.SheetNames[0]];

    const wb2 = XLSX.read(csv2Str, { type: "string" });
    const ws2 = wb2.Sheets[wb2.SheetNames[0]];

    // Stvori novu radnu knjigu (Excel)
    const newWb = XLSX.utils.book_new();

    // Dodaj listove
    XLSX.utils.book_append_sheet(newWb, ws1, "Jedinstvene Lokacije");
    XLSX.utils.book_append_sheet(newWb, ws2, "Svi izvučeni zapisi");

    // Spremi kao XLSX
    const fileName = "Glagoljasko_Pjevanje_Podaci.xlsx";
    XLSX.writeFile(newWb, fileName);
    
    console.log(`Uspješno stvorena datoteka: ${fileName}`);
} catch (error) {
    console.error("Greška pri spajanju u Excel:", error);
}
