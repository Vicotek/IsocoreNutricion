export interface Supplement {
  id: string;
  icon: string;
  title: string;
  summary: string;
  purpose: string;
  when: string;
  evidence: string;
  precautions: string;
  related: Array<{ type: string; text: string }>;
}
