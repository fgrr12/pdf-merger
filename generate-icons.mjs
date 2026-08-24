import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "src-tauri", "icons");

// El icono de Grapa: dos hojas unidas por una grapa.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#2e1065" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="112" ry="112" fill="url(#bg)"/>

  <g filter="url(#soft)">
    <!-- Hoja de atras -->
    <rect x="128" y="118" width="176" height="240" rx="20" fill="#ffffff" opacity="0.55"/>
    <!-- Hoja de adelante -->
    <rect x="200" y="160" width="176" height="240" rx="20" fill="#ffffff"/>
  </g>

  <!-- Renglones de la hoja de adelante -->
  <g fill="#c4b5fd">
    <rect x="232" y="262" width="112" height="14" rx="7"/>
    <rect x="232" y="298" width="88" height="14" rx="7"/>
    <rect x="232" y="334" width="104" height="14" rx="7"/>
  </g>

  <!-- La grapa que une las dos hojas -->
  <path d="M186 214v-38a46 46 0 0 1 92 0v104"
        fill="none" stroke="#4c1d95" stroke-width="30" stroke-linecap="round"/>
</svg>
`;

async function generate() {
  const sizes = [
    { name: "32x32.png", size: 32 },
    { name: "128x128.png", size: 128 },
    { name: "128x128@2x.png", size: 256 },
    { name: "icon.png", size: 512 },
    { name: "Square30x30Logo.png", size: 30 },
    { name: "Square44x44Logo.png", size: 44 },
    { name: "Square71x71Logo.png", size: 71 },
    { name: "Square89x89Logo.png", size: 89 },
    { name: "Square107x107Logo.png", size: 107 },
    { name: "Square142x142Logo.png", size: 142 },
    { name: "Square150x150Logo.png", size: 150 },
    { name: "Square284x284Logo.png", size: 284 },
    { name: "Square310x310Logo.png", size: 310 },
    { name: "StoreLogo.png", size: 50 },
  ];

  const svgBuffer = Buffer.from(svg);

  for (const { name, size } of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    writeFileSync(join(iconsDir, name), buf);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // ICO: 16, 32, 48, 256 sizes packed
  const icoSizes = [16, 32, 48, 256];
  const icoImages = [];
  for (const size of icoSizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    icoImages.push({ size, buf });
  }

  // Build ICO file manually
  const icoBuffer = buildIco(icoImages);
  writeFileSync(join(iconsDir, "icon.ico"), icoBuffer);
  console.log("✓ icon.ico");

  // ICNS: just use the 512px PNG as a simple wrapper
  // For simplicity, create a basic icns with the 256 and 512 sizes
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer();
  const icnsBuffer = buildIcns(png256, png512);
  writeFileSync(join(iconsDir, "icon.icns"), icnsBuffer);
  console.log("✓ icon.icns");

  console.log("\nDone! All icons generated.");
}

function buildIco(images) {
  // ICO format: header + directory entries + image data
  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let offset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const imageBuffers = [];

  for (const { size, buf } of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // offset

    dirEntries.push(entry);
    imageBuffers.push(buf);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

function buildIcns(png256, png512) {
  // Simple ICNS with ic08 (256px) and ic10 (512px) PNG entries
  const ic08Type = Buffer.from("ic08");
  const ic08Size = Buffer.alloc(4);
  ic08Size.writeUInt32BE(8 + png256.length);
  const ic08 = Buffer.concat([ic08Type, ic08Size, png256]);

  const ic10Type = Buffer.from("ic10");
  const ic10Size = Buffer.alloc(4);
  ic10Size.writeUInt32BE(8 + png512.length);
  const ic10 = Buffer.concat([ic10Type, ic10Size, png512]);

  const totalSize = 8 + ic08.length + ic10.length;
  const header = Buffer.alloc(8);
  header.write("icns", 0);
  header.writeUInt32BE(totalSize, 4);

  return Buffer.concat([header, ic08, ic10]);
}

generate().catch(console.error);
