import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";

const outputPath = path.join(os.homedir(), "Downloads", "kuechenbon-beispiel.pdf");

const doc = new PDFDocument({
  size: [226, 600], // ~80mm thermal printer width
  margins: { top: 10, bottom: 10, left: 10, right: 10 }
});

doc.pipe(fs.createWriteStream(outputPath));

const W = 206; // usable width

// Helper
function center(text, size, bold) {
  doc.font(bold ? "Courier-Bold" : "Courier").fontSize(size);
  doc.text(text, 10, doc.y, { width: W, align: "center" });
}
function left(text, size, bold) {
  doc.font(bold ? "Courier-Bold" : "Courier").fontSize(size);
  doc.text(text, 10, doc.y, { width: W, align: "left" });
}
function rightNum(num, yStart) {
  doc.font("Courier-Bold").fontSize(8);
  doc.text(`${num}.)`, 10, yStart, { width: W, align: "right" });
}
function dashedLine() {
  doc.font("Courier").fontSize(7);
  doc.text("- - - - - - - - - - - - - - - - -", 10, doc.y, { width: W, align: "center" });
  doc.moveDown(0.3);
}
function separator() {
  doc.font("Courier").fontSize(6);
  doc.text("================================", 10, doc.y, { width: W, align: "center" });
}

// Header
center("SARK KEBAB", 11, true);
doc.moveDown(0.2);
center("LATIV #11", 11, true);
doc.moveDown(0.3);
separator();
doc.moveDown(0.2);
center("*** MITNEHMEN ***", 12, true);
doc.moveDown(0.2);
center("Zahlung: BAR", 9, true);
doc.moveDown(0.2);
separator();
doc.moveDown(0.2);

center("Bestellung #XG9Znyun0K", 6, false);
center("15.04.2026 14:11", 6, false);
doc.moveDown(0.2);
separator();
doc.moveDown(0.4);

// Item 1
const y1 = doc.y;
left("1x CHICKEN", 11, true);
left("FAJITAS DÜRÜM", 11, true);
left("   >> MIT ALLEM", 9, true);
left("   OHNE ZWIEBEL", 9, true);
const savedY1 = doc.y;
rightNum(1, y1 + 5);
doc.y = savedY1;
doc.moveDown(0.3);
dashedLine();
doc.moveDown(0.2);

// Item 2
const y2 = doc.y;
left("1x DÖNER", 11, true);
left("   >> MIT ALLEM", 9, true);
left("   OHNE ZWIEBEL", 9, true);
const savedY2 = doc.y;
rightNum(2, y2 + 2);
doc.y = savedY2;
doc.moveDown(0.3);
dashedLine();
doc.moveDown(0.2);

// Item 3
const y3 = doc.y;
left("2x DÖNER TELLER", 11, true);
left("MIT POMMES", 11, true);
left("   >> MIT ALLEM", 9, true);
left("   + SCHARF", 9, true);
left("   * extra knusprig", 8, true);
const savedY3 = doc.y;
rightNum(3, y3 + 10);
doc.y = savedY3;
doc.moveDown(0.3);
dashedLine();
doc.moveDown(0.5);

// Footer
center("--- KUECHENBON ---", 8, false);

doc.end();
console.log("PDF created:", outputPath);
