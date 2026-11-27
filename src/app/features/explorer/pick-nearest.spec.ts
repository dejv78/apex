import { TOUCH_MARKER_SCALE, TOUCH_PICK_RADIUS, nearestTarget } from './pick-nearest';

describe('nearestTarget', () => {
  const targets = [
    { x: 100, y: 100, item: 'a' },
    { x: 110, y: 100, item: 'b' },
    { x: 300, y: 300, item: 'c' },
  ];

  it('picks the nearest target within the radius, not just any target in range', () => {
    expect(nearestTarget(targets, 104, 100, 22)).toBe('a');
    expect(nearestTarget(targets, 107, 100, 22)).toBe('b'); // both in range, b is closer
    expect(nearestTarget(targets, 300, 310, 22)).toBe('c');
  });

  it('picks nothing when no target is within the radius', () => {
    expect(nearestTarget(targets, 200, 200, 22)).toBeNull();
    expect(nearestTarget(targets, 100, 123, 22)).toBeNull(); // 23 px away
    expect(nearestTarget(targets, 100, 122, 22)).toBe('a'); // 22 px away is still a hit
    expect(nearestTarget([], 0, 0, 22)).toBeNull();
  });

  it('lets the target nearer to the camera win when two are equally close', () => {
    const overlapping = [
      { x: 50, y: 50, item: 'far', depth: 9 },
      { x: 50, y: 50, item: 'near', depth: 4 },
    ];
    expect(nearestTarget(overlapping, 52, 50, 22)).toBe('near');
    expect(nearestTarget([...overlapping].reverse(), 52, 50, 22)).toBe('near');
  });

  it('prefers screen distance over depth', () => {
    const t = [
      { x: 50, y: 50, item: 'close-but-far-away', depth: 9 },
      { x: 60, y: 50, item: 'farther-but-near-camera', depth: 1 },
    ];
    expect(nearestTarget(t, 51, 50, 22)).toBe('close-but-far-away');
  });

  it('uses a radius that is a fingertip and markers that are larger than a mouse needs', () => {
    expect(TOUCH_PICK_RADIUS).toBeGreaterThanOrEqual(20);
    expect(TOUCH_MARKER_SCALE).toBeGreaterThan(1);
  });
});
