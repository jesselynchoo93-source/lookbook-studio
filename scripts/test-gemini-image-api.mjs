/**
 * Gate 1 (revised): Gemini API Image Generation Verification
 * Available image models:
 * - nano-banana-pro-preview
 * - gemini-3.1-flash-image-preview
 * - gemini-3-pro-image-preview
 * - gemini-2.5-flash-image
 */

import { readFileSync, writeFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex > 0) {
    process.env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function generateImage(model, parts, label) {
  console.log(`\n--- ${label}: ${model} ---`);
  const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);

    if (res.status !== 200) {
      console.log(`  Error: ${JSON.stringify(data.error?.message || data).slice(0, 300)}`);
      return null;
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    let hasImage = false;

    for (const part of parts) {
      if (part.text) console.log(`  Text: ${part.text.slice(0, 150)}`);
      if (part.inlineData) {
        hasImage = true;
        const buf = Buffer.from(part.inlineData.data, 'base64');
        const filename = `scripts/test-${model.replace(/[^a-z0-9]/g, '-')}-${label.replace(/\s/g, '-')}.png`;
        writeFileSync(filename, buf);
        console.log(`  Image: ${part.inlineData.mimeType}, ${buf.length} bytes -> ${filename}`);
      }
    }

    return { model, hasImage, partsCount: parts.length };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Gemini API Image Generation Gate 1 ===\n');

  const models = [
    'nano-banana-pro-preview',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
  ];

  // Phase 1: Text-to-image
  console.log('== Phase 1: Text-to-Image ==');
  const t2iPrompt = [{ text: 'Generate an image: A white cotton t-shirt photographed flat-lay on a seamless grey background, professional product photography, even studio lighting, clean and minimal' }];

  let workingModel = null;
  for (const model of models) {
    const result = await generateImage(model, t2iPrompt, 'text-to-image');
    if (result?.hasImage) {
      workingModel = model;
      console.log(`  >>> TEXT-TO-IMAGE CONFIRMED: ${model}`);
      break;
    }
  }

  if (!workingModel) {
    console.log('\n!!! No text-to-image model worked !!!');
    return;
  }

  // Phase 2: Image-conditioned generation (reference image + prompt)
  console.log('\n== Phase 2: Image-conditioned generation ==');
  console.log('  Downloading reference image...');
  const imgRes = await fetch('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=256&q=50');
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  const imgBase64 = imgBuf.toString('base64');
  console.log(`  Reference: ${imgBuf.length} bytes`);

  const i2iPrompt = [
    { inlineData: { mimeType: 'image/jpeg', data: imgBase64 } },
    { text: 'Using this image as a reference for the model and pose, generate a new product photography image of the same person wearing a green satin midi dress. Studio setting with seamless grey background, professional even lighting, fashion e-commerce photography style.' },
  ];

  const condResult = await generateImage(workingModel, i2iPrompt, 'image-conditioned');

  // Phase 3: Multi-image (product ref + template ref)
  if (condResult?.hasImage) {
    console.log('\n== Phase 3: Multi-image input ==');
    // Use the same image twice as a test for multi-image support
    const multiPrompt = [
      { inlineData: { mimeType: 'image/jpeg', data: imgBase64 } },
      { text: 'This is the model reference.' },
      { inlineData: { mimeType: 'image/jpeg', data: imgBase64 } },
      { text: 'This is the pose and composition reference. Generate a new product photography image combining both references: same model wearing a blue silk blouse, studio grey background, professional lighting.' },
    ];
    await generateImage(workingModel, multiPrompt, 'multi-image');
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Working model: ${workingModel}`);
  console.log(`Text-to-image: CONFIRMED`);
  console.log(`Image-conditioned: ${condResult?.hasImage ? 'CONFIRMED' : 'NOT CONFIRMED'}`);
  console.log('API: Google Generative AI (Gemini)');
  console.log('Endpoint: POST /v1beta/models/{model}:generateContent');
  console.log('Auth: API key as query param');
  console.log('Input: contents[].parts[] with text and/or inlineData');
  console.log('Output: candidates[].content.parts[] with inlineData.data (base64)');
}

main().catch(console.error);
