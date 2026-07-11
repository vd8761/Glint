import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LandingPage } from '../LandingPage';

const renderLanding = (onStartFree = vi.fn()) => {
  render(
    <LandingPage
      onStartFree={onStartFree}
      onSignIn={() => {}}
    />,
  );
  return { onStartFree };
};

describe('LandingPage', () => {
  it('renders the product identity and one primary heading', () => {
    renderLanding();

    expect(screen.getAllByText('Glint').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1, name: /design it.*issue it.*prove it/i })).toBeInTheDocument();
  });

  it('starts the free-workspace flow from the hero', () => {
    const { onStartFree } = renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: /create free workspace/i })[0]);
    expect(onStartFree).toHaveBeenCalledTimes(1);
  });

  it('opens the real public verifier from the hero', () => {
    renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: /verify a certificate/i })[0]);
    expect(screen.getByRole('dialog', { name: /verify a certificate/i })).toBeInTheDocument();
  });

  it('links navigation to real landing-page sections', () => {
    renderLanding();

    const nav = within(screen.getByRole('navigation', { name: /main navigation/i }));
    expect(nav.getByRole('link', { name: 'Workflow' })).toHaveAttribute('href', '#workflow');
    expect(nav.getByRole('link', { name: 'Certificate studio' })).toHaveAttribute('href', '#studio');
    expect(nav.getByRole('link', { name: 'Verification' })).toHaveAttribute('href', '#verification');
    expect(nav.getByRole('link', { name: 'Plans' })).toHaveAttribute('href', '#plans');
  });
});
