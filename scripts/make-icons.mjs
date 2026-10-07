import sharp from 'sharp';

const svg = 'public/icon.svg';
await sharp(svg).resize(180, 180).png().toFile('public/icon-180.png');
await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
console.log('ícones gerados');
