// render po-template.hbs → PDF Buffer ด้วย Puppeteer

const puppeteer = require("puppeteer");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

// Register Helpers (เหมือน frontend)
Handlebars.registerHelper("numberPlus1", (index) => index + 1);
Handlebars.registerHelper("gt", (a, b) => a > b);

// Load & Compile Template
const templateSource = fs.readFileSync(
    path.join(__dirname, "../templates/po-template.hbs"),
    "utf8",
);
const template = Handlebars.compile(templateSource);

// อ่านไฟล์แปลงเป็น base64 ครั้งเดียวตอน startup

const fontNormal = fs
    .readFileSync(path.join(__dirname, "../public/fonts/THSarabunNew.ttf"))
    .toString("base64");
const fontBold = fs
    .readFileSync(path.join(__dirname, "../public/fonts/THSarabunNew_Bold.ttf"))
    .toString("base64");

const FONT_NORMAL_SRC = `data:font/truetype;base64,${fontNormal}`;
const FONT_BOLD_SRC = `data:font/truetype;base64,${fontBold}`;

const logoBase64 = fs
    .readFileSync(path.join(__dirname, "../public/sukishi.png"))
    .toString("base64");
const LOGO_SRC = `data:image/png;base64,${logoBase64}`;

// pagination constants (เหมือน frontend)
const SINGLE_PAGE_MAX = 5;
const FIRST_PAGE_MAX = 5;
const MIDDLE_PAGE_MAX = 20;
const LAST_PAGE_MAX = 5;

const buildChunks = (allItems) => {
    if (!allItems.length) return [[]];
    if (allItems.length <= SINGLE_PAGE_MAX) return [[...allItems]];

    const chunks = [];
    const lastPageItems = allItems.slice(-LAST_PAGE_MAX);
    const middleItems = allItems.slice(
        FIRST_PAGE_MAX,
        allItems.length - LAST_PAGE_MAX,
    );

    chunks.push(allItems.slice(0, FIRST_PAGE_MAX));

    let cursor = 0;
    while (cursor < middleItems.length) {
        chunks.push(middleItems.slice(cursor, cursor + MIDDLE_PAGE_MAX));
        cursor += MIDDLE_PAGE_MAX;
    }

    chunks.push(lastPageItems);
    return chunks;
};

/**
 * @param {object} data  - ข้อมูล PO (mapPoRows output)
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePdfBuffer = async (data) => {
    const allItems = Array.isArray(data.items) ? data.items : [];
    const chunks = buildChunks(allItems);
    const totalPages = chunks.length;

    // Render แต่ละหน้า แล้วต่อกัน
    const renderedPages = chunks.map((pageItems, i) =>
        template({
            ...data,
            logoSrc: LOGO_SRC,
            items: pageItems,
            emptyRows: [],
            isFirstPage: i === 0,
            isLastPage: i === totalPages - 1,
            footer: {
                ...data.footer,
                pageNumber: i + 1,
                totalPages,
            },
        }),
    );

    const fullHtml = `
                        <!DOCTYPE html>
                        <html lang="th">
                        <head>
                            <meta charset="UTF-8" />
                            <style>
                                @font-face {
                                font-family: "TH Sarabun New";
                                src: url("${FONT_NORMAL_SRC}") format("truetype");
                                font-weight: normal;
                                }
                                @font-face {
                                font-family: "TH Sarabun New";
                                src: url("${FONT_BOLD_SRC}") format("truetype");
                                font-weight: bold;
                                }
                            </style>
                        </head>
                        <body>
                            ${renderedPages.join("\n")}
                        </body>
                        </html>
                    `;

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();

        await page.setContent(fullHtml, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
};

module.exports = { generatePdfBuffer };
