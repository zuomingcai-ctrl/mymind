import { createDocument, createTopic } from '../model/factory.js';
import type { MindMapDocument, StructureType } from '../model/types.js';

export type TemplateCategory = 'learning' | 'work' | 'life' | 'analysis';

export interface TemplatePreset {
  id: string;
  name: string;
  category: TemplateCategory;
  structure: StructureType;
  description: string;
  build: () => MindMapDocument;
}

function docFromTree(title: string, structure: StructureType, rootTitle: string, children: string[]): MindMapDocument {
  const doc = createDocument(title, structure);
  const root = doc.sheets[0]!.rootTopic;
  root.title = rootTitle;
  for (const c of children) {
    root.children.push(createTopic(c));
  }
  return doc;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'tpl-mindmap-blank',
    name: '空白思维导图',
    category: 'work',
    structure: 'mindmap',
    description: '经典思维导图',
    build: () => createDocument('思维导图', 'mindmap'),
  },
  {
    id: 'tpl-swot',
    name: 'SWOT 分析',
    category: 'analysis',
    structure: 'matrix',
    description: '四象限 SWOT',
    build: () =>
      docFromTree('SWOT 分析', 'matrix', 'SWOT', ['优势 Strengths', '劣势 Weaknesses', '机会 Opportunities', '威胁 Threats']),
  },
  {
    id: 'tpl-timeline-project',
    name: '项目时间轴',
    category: 'work',
    structure: 'timeline',
    description: '项目里程碑',
    build: () => docFromTree('项目时间轴', 'timeline', '项目启动', ['需求', '设计', '开发', '上线']),
  },
  {
    id: 'tpl-org-team',
    name: '团队架构',
    category: 'work',
    structure: 'org-chart',
    description: '组织结构',
    build: () => docFromTree('团队架构', 'org-chart', 'CEO', ['产品', '研发', '市场']),
  },
  {
    id: 'tpl-fishbone-qa',
    name: '鱼骨图分析',
    category: 'analysis',
    structure: 'fishbone',
    description: '问题根因',
    build: () => docFromTree('问题分析', 'fishbone', '质量问题', ['人员', '流程', '设备', '材料']),
  },
  {
    id: 'tpl-logic-flow',
    name: '逻辑流程',
    category: 'work',
    structure: 'logic-chart',
    description: '决策流程',
    build: () => docFromTree('流程', 'logic-chart', '开始', ['步骤1', '步骤2', '结束']),
  },
  {
    id: 'tpl-tree-knowledge',
    name: '知识树',
    category: 'learning',
    structure: 'tree-chart',
    description: '知识体系',
    build: () => docFromTree('知识体系', 'tree-chart', '主题', ['基础', '进阶', '实战']),
  },
  {
    id: 'tpl-brace-decompose',
    name: '括号分解',
    category: 'learning',
    structure: 'brace-map',
    description: '整体与部分',
    build: () => docFromTree('整体分解', 'brace-map', '整体', ['部分A', '部分B', '部分C']),
  },
  {
    id: 'tpl-table-plan',
    name: '计划表格',
    category: 'life',
    structure: 'tree-table',
    description: '任务清单',
    build: () => docFromTree('计划', 'tree-table', '本周计划', ['周一', '周二', '周三']),
  },
  {
    id: 'tpl-life-goals',
    name: '人生目标',
    category: 'life',
    structure: 'mindmap',
    description: '生活规划',
    build: () => docFromTree('人生目标', 'mindmap', '我的人生', ['健康', '事业', '家庭', '财务']),
  },
  {
    id: 'tpl-study-notes',
    name: '学习笔记',
    category: 'learning',
    description: '课程笔记',
    structure: 'mindmap',
    build: () => docFromTree('学习笔记', 'mindmap', '课程', ['概念', '例题', '总结']),
  },
  {
    id: 'tpl-meeting',
    name: '会议记录',
    category: 'work',
    structure: 'mindmap',
    description: '会议纪要',
    build: () => docFromTree('会议记录', 'mindmap', '会议主题', ['议题', '决议', '待办']),
  },
  {
    id: 'tpl-reading',
    name: '读书笔记',
    category: 'learning',
    structure: 'mindmap',
    description: '章节-要点-感悟',
    build: () => docFromTree('读书笔记', 'mindmap', '书名', ['章节', '金句', '感悟', '行动']),
  },
  {
    id: 'tpl-weekly',
    name: '周计划',
    category: 'life',
    structure: 'mindmap',
    description: '周一至周日',
    build: () =>
      docFromTree('周计划', 'mindmap', '本周', ['周一', '周二', '周三', '周四', '周五', '周六', '周日']),
  },
  {
    id: 'tpl-project-plan',
    name: '项目规划',
    category: 'work',
    structure: 'logic-chart',
    description: '目标-里程碑-任务',
    build: () => docFromTree('项目规划', 'logic-chart', '目标', ['里程碑1', '里程碑2', '风险', '资源']),
  },
  {
    id: 'tpl-company-org',
    name: '公司组织架构',
    category: 'work',
    structure: 'org-chart',
    description: '部门层级',
    build: () => docFromTree('组织架构', 'org-chart', '公司', ['产品', '工程', '销售', '人力']),
  },
  {
    id: 'tpl-roadmap',
    name: '产品路线图',
    category: 'work',
    structure: 'timeline',
    description: '版本时间线',
    build: () => docFromTree('产品路线图', 'timeline', '产品', ['Q1', 'Q2', 'Q3', 'Q4']),
  },
  {
    id: 'tpl-rootcause',
    name: '问题分析',
    category: 'analysis',
    structure: 'fishbone',
    description: '人机料法环',
    build: () =>
      docFromTree('问题分析', 'fishbone', '问题', ['人员', '机器', '材料', '方法', '环境']),
  },
  {
    id: 'tpl-task-list',
    name: '任务清单',
    category: 'life',
    structure: 'tree-table',
    description: '任务-负责人-状态',
    build: () => docFromTree('任务清单', 'tree-table', '任务', ['高优', '进行中', '已完成']),
  },
  {
    id: 'tpl-exam-review',
    name: '考试复习',
    category: 'learning',
    structure: 'tree-chart',
    description: '知识点树',
    build: () => docFromTree('考试复习', 'tree-chart', '科目', ['重点', '易错', '真题']),
  },
];

export function listTemplates(category?: TemplateCategory): TemplatePreset[] {
  if (!category) return [...TEMPLATE_PRESETS];
  return TEMPLATE_PRESETS.filter((t) => t.category === category);
}

export function getTemplate(id: string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find((t) => t.id === id);
}

export function createFromTemplate(templateId: string): MindMapDocument {
  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error(`Unknown template: ${templateId}`);
  return tpl.build();
}

export function listTemplateCategories(): TemplateCategory[] {
  return ['learning', 'work', 'life', 'analysis'];
}
