import { describe, it, expect } from 'vitest';
import { createTopic } from '../../model/factory.js';
import { TextMeasurer } from '../../layout/measure.js';
import {
  listTopicAccessories,
  layoutTopicContent,
  estimateMarkersWidth,
  LABEL_ROW_H,
} from '../topic-adornments.js';

describe('topic adornments (EL-001/002/003)', () => {
  it('listTopicAccessories detects note / link / attachment', () => {
    const topic = createTopic('t');
    topic.note = '详细说明';
    topic.hyperlink = { type: 'url', target: 'https://example.com' };
    topic.attachments = [
      { id: 'a1', name: 'f.pdf', mimeType: 'application/pdf', size: 1 },
    ];
    expect(listTopicAccessories(topic)).toEqual(['note', 'link', 'attachment']);
  });

  it('measureTopic grows for markers, note icon, and labels', () => {
    const m = new TextMeasurer();
    const plain = createTopic('plain');
    plain.title = '遗留bug解决';
    const base = m.measureTopic(plain, 1);

    const rich = createTopic('rich');
    rich.title = '遗留bug解决';
    rich.markers = ['priority-2'];
    rich.note = '有备注';
    rich.labels = [
      { id: 'l1', text: 'fff', color: '#4A90D9' },
      { id: 'l2', text: 'e232332', color: '#4A90D9' },
    ];
    const sized = m.measureTopic(rich, 1);

    expect(sized.width).toBeGreaterThan(base.width);
    expect(sized.height).toBeGreaterThanOrEqual(base.height + LABEL_ROW_H);
    expect(estimateMarkersWidth(1)).toBeGreaterThan(0);
  });

  it('layoutTopicContent places markers left and labels below title', () => {
    const topic = createTopic('n');
    topic.title = '主题';
    topic.markers = ['priority-2'];
    topic.note = 'note';
    topic.labels = [{ id: 'l1', text: 'fff', color: '#ccc' }];
    const node = { x: 100, y: 50, width: 160, height: 52 };
    const layout = layoutTopicContent(node, topic);

    expect(layout.markersOrigin.x).toBe(node.x + 8);
    expect(layout.markersOrigin.y).toBeLessThan(node.y + layout.titleBandHeight);
    expect(layout.labelsOrigin.y).toBeGreaterThanOrEqual(node.y + layout.titleBandHeight - 1);
    expect(layout.accessoriesWidth).toBeGreaterThan(0);
    expect(layout.titleX).toBeGreaterThan(layout.markersOrigin.x);
  });
});
