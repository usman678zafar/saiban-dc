export const fieldWorkerProjects = ['Link Road/لنک روڈ', 'Talagang/تلہ گنگ', 'Schools/مکاتب', 'Volunteer/رضاکار'] as const;

export type FieldWorkerProject = (typeof fieldWorkerProjects)[number];
