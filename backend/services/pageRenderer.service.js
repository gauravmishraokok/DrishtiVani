const pdfjs = require('pdfjs-dist/legacy/build/pdf');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Renders a specific PDF page from an already loaded PDF object.
 * Returns the relative path of the saved image.
 */
const renderPageToImage = async (pdf, pageNum, chapterId, outputDirName) => {
    try {
        if (pageNum < 1 || pageNum > pdf.numPages) {
            throw new Error(`Invalid page number: ${pageNum}`);
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const relativePath = `${outputDirName}/page_${pageNum}.png`;
        const absolutePath = path.join(__dirname, '../uploads', relativePath);

        // Ensure dir exists
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(absolutePath, canvas.toBuffer('image/png'));

        return relativePath;
    } catch (error) {
        console.error(`[PageRenderer] Error rendering page ${pageNum}:`, error);
        throw error;
    }
};

module.exports = {
    renderPageToImage
};
