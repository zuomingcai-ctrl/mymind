<script setup lang="ts">
import { computed } from 'vue';
import type { Sheet, StructureOptions, StructureType } from '@mymind/core';
import {
  STRUCTURE_SECTIONS,
  UpdateSheetStructureCommand,
  UpdateStructureOptionsCommand,
} from '@mymind/core';
import { useDocument } from '../../composables/useDocument';

const props = defineProps<{
  sheetId: string;
  sheet: Sheet;
}>();

const { dispatch } = useDocument();

const opts = computed(() => props.sheet.structureOptions);

function onStructureChange(type: StructureType) {
  if (type === props.sheet.structure) return;
  dispatch(new UpdateSheetStructureCommand(props.sheetId, type));
}

function patchOptions(next: StructureOptions) {
  dispatch(new UpdateStructureOptionsCommand(props.sheetId, next));
}

function patchMindmap(partial: Partial<Extract<StructureOptions, { type: 'mindmap' }>>) {
  if (opts.value.type !== 'mindmap') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchLogic(partial: Partial<Extract<StructureOptions, { type: 'logic-chart' }>>) {
  if (opts.value.type !== 'logic-chart') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchTree(partial: Partial<Extract<StructureOptions, { type: 'tree-chart' }>>) {
  if (opts.value.type !== 'tree-chart') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchOrg(partial: Partial<Extract<StructureOptions, { type: 'org-chart' }>>) {
  if (opts.value.type !== 'org-chart') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchTimeline(partial: Partial<Extract<StructureOptions, { type: 'timeline' }>>) {
  if (opts.value.type !== 'timeline') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchFishbone(partial: Partial<Extract<StructureOptions, { type: 'fishbone' }>>) {
  if (opts.value.type !== 'fishbone') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchMatrix(partial: Partial<Extract<StructureOptions, { type: 'matrix' }>>) {
  if (opts.value.type !== 'matrix') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchBrace(partial: Partial<Extract<StructureOptions, { type: 'brace-map' }>>) {
  if (opts.value.type !== 'brace-map') return;
  patchOptions({ ...opts.value, ...partial });
}

function patchTreeTable(partial: Partial<Extract<StructureOptions, { type: 'tree-table' }>>) {
  if (opts.value.type !== 'tree-table') return;
  patchOptions({ ...opts.value, ...partial });
}

function onMatrixTitles(raw: string) {
  if (opts.value.type !== 'matrix') return;
  const titles = raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const count = opts.value.rows * opts.value.cols;
  while (titles.length < count) titles.push(`象限${titles.length + 1}`);
  patchMatrix({ titles: titles.slice(0, count) });
}

function onMatrixSize(rows: number, cols: number) {
  if (opts.value.type !== 'matrix') return;
  const count = rows * cols;
  const titles = [...opts.value.titles];
  while (titles.length < count) titles.push(`象限${titles.length + 1}`);
  patchMatrix({ rows, cols, titles: titles.slice(0, count) });
}

function onMatrixRowsChange(v: number | undefined) {
  if (v == null || opts.value.type !== 'matrix') return;
  onMatrixSize(v, opts.value.cols);
}

function onMatrixColsChange(v: number | undefined) {
  if (v == null || opts.value.type !== 'matrix') return;
  onMatrixSize(opts.value.rows, v);
}
</script>

<template>
  <el-form label-position="top" size="small" class="structure-picker">
    <el-form-item label="结构类型">
      <el-select
        data-testid="structure-type-select"
        :model-value="sheet.structure"
        style="width: 100%"
        @change="onStructureChange"
      >
        <el-option
          v-for="section in STRUCTURE_SECTIONS"
          :key="section.type"
          :label="section.label"
          :value="section.type"
        />
      </el-select>
    </el-form-item>

    <el-divider content-position="left">结构选项</el-divider>

    <template v-if="opts.type === 'mindmap'">
      <el-form-item label="左右平衡">
        <el-switch
          :model-value="opts.balanced"
          @change="(v: string | number | boolean) => patchMindmap({ balanced: !!v })"
        />
      </el-form-item>
      <el-form-item label="方向">
        <el-select
          :model-value="opts.direction ?? 'auto'"
          style="width: 100%"
          @change="(v: 'auto' | 'left' | 'right') => patchMindmap({ direction: v })"
        >
          <el-option label="自动" value="auto" />
          <el-option label="向左" value="left" />
          <el-option label="向右" value="right" />
        </el-select>
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'logic-chart'">
      <el-form-item label="方向">
        <el-select
          :model-value="opts.direction"
          style="width: 100%"
          @change="(v: 'left' | 'right') => patchLogic({ direction: v })"
        >
          <el-option label="向左" value="left" />
          <el-option label="向右" value="right" />
        </el-select>
      </el-form-item>
      <el-form-item label="连线样式">
        <el-select
          :model-value="opts.lineStyle ?? 'curve'"
          style="width: 100%"
          @change="(v: 'curve' | 'polyline') => patchLogic({ lineStyle: v })"
        >
          <el-option label="曲线" value="curve" />
          <el-option label="折线" value="polyline" />
        </el-select>
      </el-form-item>
      <el-form-item label="节点显示">
        <el-select
          :model-value="opts.nodeDisplay ?? 'mixed'"
          style="width: 100%"
          @change="(v: 'box' | 'underline' | 'mixed') => patchLogic({ nodeDisplay: v })"
        >
          <el-option label="方框" value="box" />
          <el-option label="下划线" value="underline" />
          <el-option label="混合" value="mixed" />
        </el-select>
      </el-form-item>
      <el-form-item label="叶子分组">
        <el-select
          :model-value="opts.groupLeaves ?? 'none'"
          style="width: 100%"
          @change="(v: 'none' | 'brace') => patchLogic({ groupLeaves: v })"
        >
          <el-option label="无" value="none" />
          <el-option label="括号" value="brace" />
        </el-select>
      </el-form-item>
      <el-form-item label="根节点显示">
        <el-select
          :model-value="opts.rootDisplay ?? 'box'"
          style="width: 100%"
          @change="(v: 'box' | 'underline') => patchLogic({ rootDisplay: v })"
        >
          <el-option label="方框" value="box" />
          <el-option label="下划线" value="underline" />
        </el-select>
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'tree-chart'">
      <el-form-item label="方向">
        <el-select
          :model-value="opts.direction"
          style="width: 100%"
          @change="(v: 'top-down' | 'bottom-up') => patchTree({ direction: v })"
        >
          <el-option label="自上而下" value="top-down" />
          <el-option label="自下而上" value="bottom-up" />
        </el-select>
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'org-chart'">
      <el-form-item label="紧凑布局">
        <el-switch
          :model-value="opts.compact"
          @change="(v: string | number | boolean) => patchOrg({ compact: !!v })"
        />
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'timeline'">
      <el-form-item label="主轴">
        <el-select
          :model-value="opts.axis"
          style="width: 100%"
          @change="(v: 'horizontal' | 'vertical') => patchTimeline({ axis: v })"
        >
          <el-option label="水平" value="horizontal" />
          <el-option label="垂直" value="vertical" />
        </el-select>
      </el-form-item>
      <el-form-item label="交替排列">
        <el-switch
          :model-value="opts.alternate"
          @change="(v: string | number | boolean) => patchTimeline({ alternate: !!v })"
        />
      </el-form-item>
      <el-form-item label="显示刻度">
        <el-switch
          :model-value="opts.showScale"
          @change="(v: string | number | boolean) => patchTimeline({ showScale: !!v })"
        />
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'fishbone'">
      <el-form-item label="鱼头位置">
        <el-select
          :model-value="opts.headPosition"
          style="width: 100%"
          @change="(v: 'left' | 'right') => patchFishbone({ headPosition: v })"
        >
          <el-option label="左侧" value="left" />
          <el-option label="右侧" value="right" />
        </el-select>
      </el-form-item>
      <el-form-item label="分支角度">
        <el-input-number
          :model-value="opts.branchAngle"
          :min="15"
          :max="75"
          :step="5"
          controls-position="right"
          @change="(v: number | undefined) => v != null && patchFishbone({ branchAngle: v })"
        />
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'matrix'">
      <el-form-item label="行数">
        <el-input-number
          :model-value="opts.rows"
          :min="1"
          :max="6"
          controls-position="right"
          @change="onMatrixRowsChange"
        />
      </el-form-item>
      <el-form-item label="列数">
        <el-input-number
          :model-value="opts.cols"
          :min="1"
          :max="6"
          controls-position="right"
          @change="onMatrixColsChange"
        />
      </el-form-item>
      <el-form-item label="象限标题">
        <el-input
          :model-value="opts.titles.join(', ')"
          placeholder="用逗号分隔"
          @change="onMatrixTitles"
        />
      </el-form-item>
      <el-form-item label="分配模式">
        <el-select
          :model-value="opts.assignMode"
          style="width: 100%"
          @change="(v: 'auto' | 'manual') => patchMatrix({ assignMode: v })"
        >
          <el-option label="自动" value="auto" />
          <el-option label="手动" value="manual" />
        </el-select>
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'brace-map'">
      <el-form-item label="括号侧">
        <el-select
          :model-value="opts.braceSide"
          style="width: 100%"
          @change="(v: 'left' | 'right') => patchBrace({ braceSide: v })"
        >
          <el-option label="左侧" value="left" />
          <el-option label="右侧" value="right" />
        </el-select>
      </el-form-item>
      <el-form-item label="部分位置">
        <el-select
          :model-value="opts.partPosition ?? 'opposite'"
          style="width: 100%"
          @change="(v: 'same' | 'opposite') => patchBrace({ partPosition: v })"
        >
          <el-option label="同侧" value="same" />
          <el-option label="对侧" value="opposite" />
        </el-select>
      </el-form-item>
    </template>

    <template v-else-if="opts.type === 'tree-table'">
      <el-form-item label="显示树线">
        <el-switch
          :model-value="opts.showTreeLine"
          @change="(v: string | number | boolean) => patchTreeTable({ showTreeLine: !!v })"
        />
      </el-form-item>
      <el-form-item label="列字段">
        <div class="column-list">
          <div v-for="col in opts.columns" :key="col.id" class="column-row">
            <span>{{ col.label }}</span>
            <el-tag size="small">{{ col.field }}</el-tag>
            <el-input-number
              :model-value="col.width"
              :min="60"
              :max="400"
              size="small"
              controls-position="right"
              @change="
                (v: number | undefined) => {
                  if (v == null || opts.type !== 'tree-table') return;
                  patchTreeTable({
                    columns: opts.columns.map((c) =>
                      c.id === col.id ? { ...c, width: v } : c,
                    ),
                  });
                }
              "
            />
          </div>
        </div>
      </el-form-item>
    </template>
  </el-form>
</template>

<style scoped>
.structure-picker {
  padding: 0 4px 12px;
}
.column-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.column-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
