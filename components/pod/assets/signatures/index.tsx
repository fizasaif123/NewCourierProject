// Function to create a signature-like SVG path from a name
const createSignaturePath = (name: string, startX: number = 20, startY: number = 50) => {
  // Create a flowing signature-like path based on name length
  const letters = name.length;
  const width = 260; // Total width available
  const segmentWidth = width / (letters + 1);
  
  let path = `M ${startX} ${startY} `;
  
  // Create flowing curves for each letter
  for (let i = 0; i < letters; i++) {
    const x1 = startX + (i * segmentWidth);
    const x2 = startX + ((i + 1) * segmentWidth);
    const y1 = startY - (Math.random() * 20);
    const y2 = startY + (Math.random() * 20);
    path += `C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${startY} `;
  }
  
  return path;
};

// Create signature SVGs for different names
export const createSignatureSvg = (name: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100">
  <path d="${createSignaturePath(name)}" 
    stroke="black" fill="none" stroke-width="2"/>
  <text x="150" y="80" text-anchor="middle" font-family="cursive" font-size="12" fill="#666">
    ${name}
  </text>
</svg>
`;

// Example signatures
export const Signature1 = createSignatureSvg("John");
export const Signature2 = createSignatureSvg("Sarah");
export const Signature3 = createSignatureSvg("Emma");
export const DeliverySignature1 = createSignatureSvg("Mike");
export const DeliverySignature2 = createSignatureSvg("David");
export const DeliverySignature3 = createSignatureSvg("James"); 