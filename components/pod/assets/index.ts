import { 
  Signature1, 
  Signature2, 
  Signature3,
  DeliverySignature1,
  DeliverySignature2,
  DeliverySignature3,
  createSignatureSvg 
} from './signatures';
import { POD1, POD2, POD3 } from './pods';

// Convert SVG to data URL
const svgToDataUrl = (svg: string) => 
  `data:image/svg+xml;base64,${btoa(svg)}`;

// Export your image paths
export const POD_IMAGES = {
  pod1: svgToDataUrl(POD1),
  pod2: svgToDataUrl(POD2),
  pod3: svgToDataUrl(POD3)
};

export const SIGNATURES = {
  // Receiver signatures
  sig1: svgToDataUrl(Signature1),
  sig2: svgToDataUrl(Signature2),
  sig3: svgToDataUrl(Signature3),
  // Driver signatures
  delivery1: svgToDataUrl(DeliverySignature1),
  delivery2: svgToDataUrl(DeliverySignature2),
  delivery3: svgToDataUrl(DeliverySignature3),
  // Function to create new signatures
  create: (name: string) => svgToDataUrl(createSignatureSvg(name))
}; 