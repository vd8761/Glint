/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local QR code generation.
 *
 * Every QR code in this app used to be an `<img>` pointing at
 * `https://api.qrserver.com/v1/create-qr-code/?...&data=<the verification URL>`.
 *
 * That meant a third party received the identifier of every certificate anyone
 * looked at, and controlled the image that a page describing itself as
 * "tamper-proof" printed as its verification code. It also tainted the canvas
 * that html2canvas draws from, so the QR could not appear in a downloaded PDF.
 *
 * `qrcode` is a dependency now. It is imported dynamically so the ~40kB only
 * loads on pages that actually draw a code.
 */

import { useEffect, useState } from 'react';

export interface QrOptions {
  /** Pixel size of the generated bitmap. Rendered size is set by CSS. */
  width?: number;
  dark?: string;
  light?: string;
}

/**
 * Returns a `data:image/png;base64,...` URL for `value`, or '' while it is being
 * generated or if `value` is empty.
 */
export function useQrDataUrl(value: string | null | undefined, options: QrOptions = {}): string {
  const { width = 240, dark = '#0f172a', light = '#ffffff' } = options;
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    let cancelled = false;
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(value, { margin: 0, width, color: { dark, light } }))
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [value, width, dark, light]);

  return dataUrl;
}
