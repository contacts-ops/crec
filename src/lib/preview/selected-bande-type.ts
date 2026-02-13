export interface EditableField {
    id: string;
    text: string;
    label: string;
    type: string;
  }
  

export type SelectedBande = {
    id: string;
    originalId: string;
    fields: EditableField[];
} | null;