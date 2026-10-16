import { api } from '@/lib/api';

type Qz = {
  websocket: { isActive: () => boolean; connect: () => Promise<null>; disconnect: () => Promise<null> };
  printers: {
    find: (query?: string) => Promise<string | string[]>;
    getDefault: () => Promise<string>;
  };
  configs: { create: (printer: string, options?: object) => unknown };
  print: (config: unknown, data: object[]) => Promise<null>;
  security: {
    setSignatureAlgorithm: (algorithm: string) => void;
    setCertificatePromise: (handler: (resolve: (cert: string) => void, reject: (err?: unknown) => void) => void) => void;
    setSignaturePromise: (factory: (toSign: string) => (resolve: (signature: string) => void, reject: (err?: unknown) => void) => void) => void;
  };
};

export class QzRefused extends Error {}

function qzOnWindow() {
  return (window as Window & { qz?: Qz }).qz;
}

function trust(qz: Qz) {
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setCertificatePromise((resolve, reject) => {
    api<{ certificate: string }>('/api/v1/qz/certificate').then((data) => resolve(data.certificate)).catch(reject);
  });
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    api<{ signature: string }>('/api/v1/qz/sign', { method: 'POST', body: JSON.stringify({ request: toSign }) })
      .then((data) => resolve(data.signature))
      .catch(reject);
  });
}

function loadQz() {
  const ready = qzOnWindow();
  if (ready?.websocket) {
    trust(ready);
    return Promise.resolve(ready);
  }
  return new Promise<Qz>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/qz-tray.js';
    script.async = true;
    script.onload = () => {
      const qz = qzOnWindow();
      if (!qz?.websocket) {
        reject(new Error('Không tải được QZ Tray'));
        return;
      }
      trust(qz);
      resolve(qz);
    };
    script.onerror = () => reject(new Error('Không tải được QZ Tray'));
    document.head.appendChild(script);
  });
}

async function logoData() {
  const res = await fetch('/logo.png');
  if (!res.ok) return '';
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function receiptHtml() {
  const box = document.getElementById('bill-print');
  if (!box) return '';
  let body = box.innerHTML;
  try {
    const logo = await logoData();
    if (logo) body = body.replace(/src="[^"]*logo\.png[^"]*"/, `src="${logo}"`);
    else body = body.replace(/<img[^>]*bill-logo[^>]*>/, '');
  } catch {
    body = body.replace(/<img[^>]*class="bill-logo"[^>]*>/, '');
  }
  const css = [
    'html,body{margin:0;padding:0;width:3.15in;background:#fff;color:#000}',
    'pre{margin:0;padding:0 0.12in;width:2.9in;font-family:"Courier New",Courier,monospace;font-size:14px;font-weight:600;line-height:1.35;white-space:pre;color:#000;-webkit-font-smoothing:none;-webkit-text-stroke:0.35px #000}',
    '.bill-top{display:flex;align-items:flex-start;justify-content:space-between;gap:0.08in;padding:0.08in 0.12in 0}',
    '.bill-logo{width:1.57in;height:auto;flex-shrink:0}',
    '.bill-feed{display:flex;align-items:flex-end;justify-content:flex-end;height:2.36in}',
    '.bill-feed span{display:block;width:2px;height:2px;background:#000}',
  ].join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

async function pickPrinter(qz: Qz) {
  for (const query of ['XP-T80L', 'Xprinter']) {
    try {
      const found = await qz.printers.find(query);
      const name = Array.isArray(found) ? found.find(Boolean) : found;
      if (name) return name;
    } catch {
      continue;
    }
  }
  return qz.printers.getDefault();
}

export async function printReceiptQuiet() {
  const html = await receiptHtml();
  if (!html) return false;
  let qz: Qz;
  try {
    qz = await loadQz();
    if (qz.websocket.isActive()) await qz.websocket.disconnect();
    await qz.websocket.connect();
  } catch {
    return false;
  }
  try {
    const printer = await pickPrinter(qz);
    const config = qz.configs.create(printer, {
      units: 'in',
      size: { width: 3.15 },
      margins: 0,
      scaleContent: true,
      rasterize: true,
      colorType: 'blackwhite',
      interpolation: 'nearest-neighbor',
    });
    await qz.print(config, [{
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: html,
      options: { pageWidth: 3.15 },
    }]);
    return true;
  } catch (err) {
    const detail = err instanceof Error ? err.message : '';
    throw new QzRefused(detail ? `QZ Tray từ chối in: ${detail}` : 'QZ Tray từ chối in');
  }
}
