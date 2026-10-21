// InBody metrics and client-side image compression (InBody Reports, C9).

export function compressImage(file, max = 1200, quality = 0.74) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export const IN_METRICS = [
  { key: 'weight', label: 'Weight', kind: 'mass', goodUp: null },
  { key: 'muscle', label: 'Skeletal muscle mass', kind: 'mass', goodUp: true },
  { key: 'fatMass', label: 'Body fat mass', kind: 'mass', goodUp: false },
  { key: 'fatPct', label: 'Body fat %', kind: '%', goodUp: false },
  { key: 'visceral', label: 'Visceral fat level', kind: '', goodUp: false },
  { key: 'bmr', label: 'BMR (kcal)', kind: 'kcal', goodUp: true },
];
