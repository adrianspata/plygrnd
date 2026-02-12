/**
 * Console Signature Easter Egg
 * Displays a styled message and ASCII art in the browser DevTools console
 */

export function showConsoleSignature() {
  // ASCII Art - Smiley Face
  const art = String.raw`
..██......██....██...██████.....███████..
..██.......██..██....██...██....██...██..
..██........████.....██████.....███████..
..██.........██......██..██.....██...██..
..██.........██......██...██....██...██..
..████████...██......██....██...██...██..
  `;

  // Styled welcome message
  console.log(
    'Website made by yours truly https://www.lyrastudio.se/',
  );

  // ASCII Art
  console.log(
    '%c' + art,
    'font-family: monospace; color: #ad8100; font-size: 12px; line-height: 1.2;'
  );
}
