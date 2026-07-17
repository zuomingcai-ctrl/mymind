// covers: pipeline integration
import { describe, it, expect } from 'vitest';
import { createDocument } from '../model/factory.js';
import { CommandBus } from '../commands/bus.js';
import { AddTopicCommand, UpdateTopicTitleCommand } from '../commands/topic-commands.js';
import { createDefaultLayoutRegistry } from '../layout/registry.js';
import { createMeasureFn } from '../layout/measure.js';
import { buildFrame } from '../render/pipeline.js';

describe('Command → Layout → Render pipeline', () => {
  it('add topic updates layout node count and frame', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);
    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'child'));

    const sheet = bus.getDocument().sheets[0]!;
    const registry = createDefaultLayoutRegistry();
    const layout = registry.layout(sheet, createMeasureFn());
    expect(layout.nodes.size).toBe(2);

    const frame = buildFrame(sheet, layout);
    const topicLayer = frame.layers.find((l) => l.type === 'topics');
    expect(topicLayer && topicLayer.type === 'topics' ? topicLayer.nodes.length : 0).toBe(2);
  });

  it('title change affects measured node size in frame', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    const registry = createDefaultLayoutRegistry();
    const measure = createMeasureFn();
    const before = registry.layout(bus.getDocument().sheets[0]!, measure);
    const beforeWidth = before.nodes.get(rootId)!.width;

    bus.dispatch(new UpdateTopicTitleCommand(sheetId, rootId, 'Very Long Title Text Here'));
    const after = registry.layout(bus.getDocument().sheets[0]!, measure);
    const afterWidth = after.nodes.get(rootId)!.width;

    expect(afterWidth).toBeGreaterThanOrEqual(beforeWidth);
    buildFrame(bus.getDocument().sheets[0]!, after);
  });
});
