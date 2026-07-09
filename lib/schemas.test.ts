import { describe, expect, it } from 'vitest';
import { templateBodySchema } from './schemas';

describe('templateBodySchema', () => {
  it('preserves rich text runs for template text elements', () => {
    const parsed = templateBodySchema.parse({
      workspaceId: 'ws_test',
      name: 'Rich Text Test',
      layout: 'landscape',
      backgroundColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
      showSeal: false,
      sealType: 'none',
      showQrCode: false,
      logoX: 50,
      logoY: 10,
      logoWidth: 100,
      signatureX: 50,
      signatureY: 75,
      signatureWidth: 90,
      textElements: [
        {
          id: 't1',
          text: 'Hello world',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          color: '#111111',
          xPercent: 50,
          yPercent: 50,
          align: 'center',
          richText: [
            { text: 'Hello ', color: '#111111' },
            {
              text: 'world',
              color: '#ff0000',
              fontWeight: 'bold',
              fontStyle: 'italic',
              textDecoration: 'underline',
            },
          ],
        },
      ],
    });

    expect(parsed.textElements?.[0].richText).toEqual([
      { text: 'Hello ', color: '#111111' },
      {
        text: 'world',
        color: '#ff0000',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'underline',
      },
    ]);
  });
});
