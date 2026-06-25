import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders the main hero section', () => {
    render(
      <LandingPage 
        onStartFree={() => {}} 
        onViewSample={() => {}} 
        onSelectWorkspace={() => {}} 
      />
    );
    expect(screen.getAllByText(/GLINT REGISTRY/i)[0]).toBeInTheDocument();
  });
});
