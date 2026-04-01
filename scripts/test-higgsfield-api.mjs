/**
 * Gate 1: Higgsfield API Capability Verification (Round 3)
 *
 * CONFIRMED:
 * - Model slug: nano-banana-pro (403 = endpoint exists, needs credits)
 * - Upload: POST /files/generate-upload-url (working)
 * - Polling: GET /requests/{request_id}/status (from SDK)
 * - Auth: Key KEY_ID:KEY_SECRET
 * - Base URL: https://platform.higgsfield.ai
 *
 * Now testing: other model variants, image-to-image endpoints
 */

import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex > 0) {
    process.env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
  }
}

const API_KEY = process.env.HIGGSFIELD_API_KEY;
const API_SECRET = process.env.HIGGSFIELD_API_SECRET;
const BASE_URL = 'https://platform.higgsfield.ai';
const authHeader = `Key ${API_KEY}:${API_SECRET}`;

async function apiCall(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  const status = res.status;
  const detail = json?.detail || text.slice(0, 100);
  const tag = status === 403 ? 'EXISTS (needs credits)' :
              status === 422 ? 'EXISTS (validation error)' :
              status === 400 ? 'EXISTS (bad input)' :
              (status === 200 || status === 201 || status === 202) ? 'SUCCESS' :
              status === 404 ? 'not found' : `${status}`;
  console.log(`  ${path.padEnd(50)} ${status} ${tag} ${status >= 400 ? `| ${detail}` : ''}`);
  return { status, json };
}

async function main() {
  console.log('=== Gate 1: Higgsfield API Surface Map ===\n');

  const prompt = 'A white t-shirt on grey background, product photography';
  const imageUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=512';

  // Test confirmed slug variations
  console.log('--- Text-to-image endpoints ---');
  const textToImageSlugs = [
    'nano-banana-pro',           // CONFIRMED 403
    'nano-banana-pro/text-to-image',
    'nano-banana-2-edit',
    'nano-banana-2-edit/image-to-image',
    'flux-pro/kontext/max/text-to-image',
    'flux-kontext-dev-i2i',
    'bytedance/seedream/v4/text-to-image',
    'higgsfield-soul-image-to-image',
  ];

  for (const slug of textToImageSlugs) {
    await apiCall(`/${slug}`, { prompt, aspect_ratio: '1:1' });
  }

  // Test image-conditioned variants on confirmed slug
  console.log('\n--- Image input on /nano-banana-pro ---');
  const imageVariants = [
    { prompt, aspect_ratio: '1:1', image_url: imageUrl },
    { prompt, aspect_ratio: '1:1', input_images: [{ type: 'image_url', image_url: imageUrl }] },
    { prompt, aspect_ratio: '1:1', images_list: [imageUrl] },
    { prompt, aspect_ratio: '1:1', reference_images: [imageUrl] },
    { prompt, aspect_ratio: '1:1', image: imageUrl },
  ];

  for (const body of imageVariants) {
    const paramKey = Object.keys(body).filter(k => k !== 'prompt' && k !== 'aspect_ratio')[0];
    console.log(`  with ${paramKey}:`);
    await apiCall('/nano-banana-pro', body);
  }

  // Check if there's a separate create-image endpoint that accepts the model as a param
  console.log('\n--- Model-as-parameter endpoints ---');
  await apiCall('/generate', { model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' });
  await apiCall('/v1/generate', { model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' });
  await apiCall('/api/generate', { model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' });

  // Check account/credit info
  console.log('\n--- Account endpoints ---');
  const accountPaths = ['/account', '/me', '/credits', '/user/credits', '/api/credits'];
  for (const path of accountPaths) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Authorization': authHeader },
    });
    const text = await res.text();
    console.log(`  GET ${path.padEnd(30)} ${res.status} | ${text.slice(0, 100)}`);
  }

  console.log('\n\n=== GATE 1 SUMMARY ===');
  console.log('Model slug: nano-banana-pro (confirmed, 403 = exists but needs credits)');
  console.log('Upload: POST /files/generate-upload-url (confirmed working)');
  console.log('Polling: GET /requests/{id}/status (from SDK source code)');
  console.log('Auth: Key KEY_ID:KEY_SECRET');
  console.log('Base: https://platform.higgsfield.ai');
  console.log('\nBLOCKER: Account has 0 credits. Cannot test actual generation or image input params.');
  console.log('ACTION: Need to add credits at https://cloud.higgsfield.ai/credits');
}

main().catch(console.error);
