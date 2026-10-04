/**
 * Constants with optional Player fields
 * These are the only fields that can be added to inputInfos
 */
export const PLAYER_OPTIONAL_FIELDS = [
  'educationLevel',
  'semester',
  'course',
  'age',
  'gender',
  'profession',
] as const;

export const PLAYER_OPTIONAL_FIELDS_LABELS = {
  educationLevel: 'Education Level',
  semester: 'Semester',
  course: 'Course',
  age: 'Age',
  gender: 'Gender',
  profession: 'Profession',
};

/** Rótulos usados nos relatórios (planilhas e tela de resultado). */
export const PLAYER_OPTIONAL_FIELDS_LABELS_PT: Record<string, string> = {
  educationLevel: 'Escolaridade',
  semester: 'Semestre',
  course: 'Curso',
  age: 'Idade',
  gender: 'Gênero',
  profession: 'Profissão',
};

export type PlayerOptionalField = typeof PLAYER_OPTIONAL_FIELDS[number];

/**
 * Check if field is a valid optional Player field
 * @param field - Field to validate
 * @returns true if field is valid, false otherwise
 */
export function isValidPlayerField(field: any): field is PlayerOptionalField {
  return PLAYER_OPTIONAL_FIELDS.includes(field);
}
