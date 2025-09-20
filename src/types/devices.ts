export type Device = {
  id: string;
  name: string;
  width: number;
  height: number;
  scale?: number;
};

export const DEVICES: Device[] = [
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, scale: 1 },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, scale: 1 },
  { id: 'ipad-10', name: 'iPad 10.9"', width: 820, height: 1180, scale: 1 },
  { id: 'galaxy-s22', name: 'Galaxy S22', width: 360, height: 780, scale: 1 },
];

