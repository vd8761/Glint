/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  defaultEmailTemplate, defaultDigestTemplate, renderEmailHtml, renderEmailSubject,
  sampleEmailVars, sampleDigestVars,
  type EmailTemplateDoc, type EmailTemplateVars,
} from './emailTemplateHtml';

const vars = sampleEmailVars('Acme Institute');

describe('renderEmailSubject', () => {
  it('substitutes placeholders as plain text', () => {
    expect(renderEmailSubject('Your {{program}} credential, {{name}}', vars)).toBe(
      'Your Advanced Data Architecture credential, Alex Rivera',
    );
  });

  it('leaves unknown placeholders intact', () => {
    expect(renderEmailSubject('Hello {{nope}}', vars)).toBe('Hello {{nope}}');
  });
});

describe('renderEmailHtml', () => {
  it('renders the default template with substituted values', () => {
    const html = renderEmailHtml(defaultEmailTemplate('#1a73e8'), vars);
    expect(html).toContain('Congratulations, Alex Rivera!');
    expect(html).toContain('Advanced Data Architecture');
    expect(html).toContain('href="https://example.com/c/CERT-8F2K-D91A"');
    expect(html).toContain('Acme Institute');
  });

  it('escapes recipient-controlled values', () => {
    const html = renderEmailHtml(defaultEmailTemplate(), {
      ...vars,
      name: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('drops non-http(s) hrefs and images', () => {
    const doc: EmailTemplateDoc = {
      version: 1,
      subject: 's',
      canvas: { backgroundColor: '#fff', bodyColor: '#eee', height: 200, borderRadius: 8 },
      blocks: [
        { id: 'b1', type: 'button', x: 0, y: 0, width: 100, height: 40, text: 'Go', href: 'javascript:alert(1)' },
        { id: 'b2', type: 'image', x: 0, y: 60, width: 100, height: 40, imageUrl: 'javascript:alert(1)' },
      ],
    };
    const html = renderEmailHtml(doc, vars);
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
  });

  it('stacks blocks top-to-bottom with margin offsets', () => {
    const doc: EmailTemplateDoc = {
      version: 1,
      subject: 's',
      canvas: { backgroundColor: '#fff', bodyColor: '#eee', height: 300, borderRadius: 0 },
      blocks: [
        { id: 'low', type: 'text', x: 20, y: 100, width: 200, height: 20, text: 'second' },
        { id: 'high', type: 'text', x: 40, y: 10, width: 200, height: 20, text: 'first' },
      ],
    };
    const html = renderEmailHtml(doc, vars);
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'));
    // high: y=10 → margin-top 10, x=40 → margin-left 40
    expect(html).toContain('margin:10px 0 0 40px');
    // low: gap = 100 - (10+20) = 70, x=20
    expect(html).toContain('margin:70px 0 0 20px');
  });

  it('emits responsive sizing so the email is not clipped on mobile', () => {
    const html = renderEmailHtml(defaultEmailTemplate('#1a73e8'), vars);
    expect(html).toContain('meta name="viewport"');
    expect(html).toContain('class="glint-card"');
    expect(html).toContain('margin-left:6.6667%;width:520px;width:86.6667%');
    expect(html).toContain('.glint-block { margin-left:0 !important; width:100% !important; max-width:100% !important; }');
  });

  it('sanitizes malformed colors and fonts instead of emitting them', () => {
    const doc: EmailTemplateDoc = {
      version: 1,
      subject: 's',
      canvas: { backgroundColor: 'url(x)', bodyColor: '#eee', height: 200, borderRadius: 0 },
      blocks: [
        {
          id: 'b', type: 'text', x: 0, y: 0, width: 100, height: 20, text: 'hi',
          color: 'red;}<script>', fontFamily: '"><script>alert(1)</script>',
        },
      ],
    };
    const html = renderEmailHtml(doc, vars);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('url(x)');
  });
});

describe('digest rendering', () => {
  const dvars = sampleDigestVars('Acme Institute');

  it('substitutes {{count}} in the subject', () => {
    expect(renderEmailSubject(defaultDigestTemplate().subject, dvars)).toBe('3 certificates from Acme Institute');
  });

  it('expands the certificateList block into one card per certificate with links', () => {
    const html = renderEmailHtml(defaultDigestTemplate('#1a73e8'), dvars);
    expect(html).toContain('Alex Rivera');
    expect(html).toContain('Jordan Vance');
    expect(html).toContain('Keiko Tanaka');
    expect(html).toContain('href="https://example.com/c/CERT-8F2K-D91A"');
    expect(html).toContain('View certificate');
    // The {{count}} in the title block resolves too.
    expect(html).toContain('3 certificates are ready');
  });

  it('escapes recipient names inside the certificate list', () => {
    const evil: EmailTemplateVars = {
      ...dvars,
      certificates: [{ name: '<script>alert(1)</script>', program: 'P', id: 'X', link: 'https://example.com/c/X', date: '2026-07-10' }],
    };
    const html = renderEmailHtml(defaultDigestTemplate(), evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops a non-http link in the list rather than emitting the anchor', () => {
    const bad: EmailTemplateVars = {
      ...dvars,
      certificates: [{ name: 'A', program: 'P', id: 'X', link: 'javascript:alert(1)', date: '2026-07-10' }],
    };
    const html = renderEmailHtml(defaultDigestTemplate(), bad);
    expect(html).not.toContain('javascript:');
  });

  it('shows an empty-state when there are no certificates', () => {
    const empty: EmailTemplateVars = { ...dvars, certificates: [], count: '0' };
    const html = renderEmailHtml(defaultDigestTemplate(), empty);
    expect(html).toContain('No certificates in this batch.');
  });

  it('honours a custom link label, intro, and metadata toggles on the list block', () => {
    const doc = defaultDigestTemplate();
    doc.blocks = doc.blocks.map((b) =>
      b.type === 'certificateList'
        ? { ...b, linkLabel: 'Open now', intro: 'Your team earned these:', showProgram: false, showDate: false }
        : b,
    );
    const html = renderEmailHtml(doc, dvars);
    expect(html).toContain('Open now');
    expect(html).not.toContain('View certificate');
    expect(html).toContain('Your team earned these:');
    // With both toggles off, the program/date meta line is gone.
    expect(html).not.toContain('Advanced Data Architecture');
  });
});
