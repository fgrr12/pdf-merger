/**
 * La marca de Grapa: dos hojas grapadas. viewBox 0 0 512 512.
 *
 * Vive acá y no dibujada en cada lado porque la usan dos consumidores que no se
 * pueden importar entre sí: el header de la app (`Icons.tsx`) y el generador de
 * iconos del bundle (`generate-icons.mjs`, que corre en node). Cuando estaban
 * duplicadas, se fueron pareciendo cada vez menos.
 */
export const LOGO_INNER = `
  <defs>
    <linearGradient id="grapa-logo-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#grapa-logo-bg)"/>
  <g transform="rotate(-10 256 264)">
    <rect x="128" y="146" width="198" height="252" rx="18" fill="#ffffff" opacity=".42"/>
  </g>
  <rect x="178" y="126" width="202" height="266" rx="20" fill="#ffffff"/>
  <g fill="#c7bdf5">
    <rect x="212" y="268" width="134" height="18" rx="9"/>
    <rect x="212" y="306" width="134" height="18" rx="9"/>
  </g>
  <!-- La grapa: dos trazos gruesos. Con menos de 30 de grosor se pierde
       a 32 px, que es como se ve en el header de la app. -->
  <g stroke="#4c1d95" stroke-width="30" stroke-linecap="round">
    <path d="M212 218 L268 162"/>
    <path d="M260 234 L316 178"/>
  </g>
`;

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${LOGO_INNER}</svg>`;
