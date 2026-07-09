/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dev harness for the editor, mounted standalone at `/src/editor/demo/` so it can
 * be exercised without booting the API server or authenticating.
 *
 * Not shipped: nothing in the app imports this.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CertificateEditor } from '../CertificateEditor';
import '../../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-screen w-screen">
      <CertificateEditor />
    </div>
  </StrictMode>,
);
