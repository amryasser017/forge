import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../src/ErrorBoundary';

const make = (props = {}) => {
  const b = new ErrorBoundary({ children: 'page', ...props });
  b.setState = (patch) => { b.state = { ...b.state, ...patch }; };
  return b;
};

describe('ErrorBoundary (UI Kit)', () => {
  it('renders its children while nothing failed', () => {
    expect(make().render()).toBe('page');
  });
  it('turns a render error into state', () => {
    const err = new Error('boom');
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err });
  });
  it('shows the default message with a Try again button after an error', () => {
    const b = make();
    b.state = { error: new Error('boom') };
    const el = b.render();
    expect(el.props.role).toBe('alert');
    expect(JSON.stringify(el.props.children)).toContain('Try again');
  });
  it('uses a custom fallback and passes it a reset function', () => {
    const fallback = vi.fn(() => 'custom');
    const b = make({ fallback });
    b.state = { error: new Error('boom') };
    expect(b.render()).toBe('custom');
    const reset = fallback.mock.calls[0][1];
    reset();
    expect(b.state.error).toBeNull();
    expect(b.render()).toBe('page');
  });
  it('tries again when the reset key changes (for example a new page)', () => {
    const b = make({ resetKey: '/body' });
    b.state = { error: new Error('boom') };
    b.componentDidUpdate({ resetKey: '/body' });
    expect(b.state.error).not.toBeNull();
    b.props = { ...b.props, resetKey: '/charts' };
    b.componentDidUpdate({ resetKey: '/body' });
    expect(b.state.error).toBeNull();
  });
  it('reports the error to onError and the console', () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const b = make({ onError });
    const err = new Error('boom');
    b.componentDidCatch(err, { componentStack: 'at X' });
    expect(onError).toHaveBeenCalledWith(err, { componentStack: 'at X' });
    spy.mockRestore();
  });
});
