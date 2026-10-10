import { chunkPages } from './core.js';

export async function importFile(file, onProgress) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Please choose a file smaller than 20 MB for this version.');
  const extension = file.name.split('.').pop().toLowerCase();
  let pages;
  if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    try {
      if (pdf.numPages > 100) throw new Error('Please select a PDF with 100 pages or fewer.');
      pages = [];
      for (let page = 1; page <= pdf.numPages; page++) {
        const content = await (await pdf.getPage(page)).getTextContent();
        pages.push({ page, text: content.items.filter(i => 'str' in i).map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('') });
        onProgress?.(`Reading page ${page} of ${pdf.numPages}…`);
      }
    } finally { await pdf.destroy(); }
  } else if (['txt', 'md'].includes(extension)) {
    pages = [{ page: 1, text: await file.text() }];
  } else throw new Error('Choose a PDF, TXT, or Markdown file.');
  return createDocument(file.name, pages);
}
export function createDocument(name, pages) {
  const chars = pages.reduce((sum,p) => sum + p.text.trim().length, 0);
  if (chars < 40) throw new Error('There is not enough readable text. Scanned PDFs need OCR; try a text PDF or paste your notes.');
  const chunks = chunkPages(pages);
  if (chunks.length > 1500) throw new Error('This document is too large. Import one chapter at a time.');
  return { id: crypto.randomUUID(), name, pages: pages.length, chunks, createdAt: Date.now(), chars };
}
export const samplePages = [
  { page: 1, text: `Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. Chlorophyll in the chloroplasts absorbs light. The overall process uses carbon dioxide and water to produce glucose and oxygen. The equation is 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. Photosynthesis supports food chains by converting solar energy into a form organisms can use.\nThe light-dependent reactions occur in the thylakoid membranes of chloroplasts. Light excites electrons in chlorophyll. Water molecules are split, releasing oxygen, electrons, and hydrogen ions. The electron transport chain creates a proton gradient. ATP synthase uses this gradient to make ATP. NADP+ accepts electrons and hydrogen to form NADPH. ATP and NADPH carry energy to the Calvin cycle.` },
  { page: 2, text: `The Calvin cycle takes place in the stroma of the chloroplast. It uses ATP and NADPH from the light-dependent reactions to turn carbon dioxide into G3P, a sugar precursor. The three main stages are carbon fixation, reduction, and regeneration of RuBP. The enzyme RuBisCO attaches carbon dioxide to RuBP during carbon fixation. Some G3P leaves the cycle to help form glucose, while the rest regenerates RuBP. The Calvin cycle does not directly require light, but depends on ATP and NADPH produced by the light-dependent reactions.\nPhotosynthesis rates are affected by light intensity, carbon dioxide concentration, and temperature. Increasing light intensity raises the rate until another factor becomes limiting. Temperature affects the enzymes involved. Excessively high temperatures can damage enzymes and reduce photosynthesis. A limiting factor is the resource or condition that restricts the rate of a process even when other resources are abundant.` },
  { page: 3, text: `Photosynthesis and cellular respiration are complementary processes. Photosynthesis stores energy in glucose; cellular respiration releases energy from glucose to make ATP. Plants carry out both processes. During aerobic respiration, glucose and oxygen are used to produce carbon dioxide, water, and ATP. The overall equation is C6H12O6 + 6O2 → 6CO2 + 6H2O + energy.\nA useful way to revise is to compare the locations and products of each stage. Light-dependent reactions occur in thylakoid membranes and produce ATP, NADPH, and oxygen. The Calvin cycle occurs in the stroma and produces G3P using ATP, NADPH, and carbon dioxide. Remember that oxygen released during photosynthesis comes from water, not carbon dioxide. The glucose produced stores chemical energy that can be used later in respiration.` },
];
