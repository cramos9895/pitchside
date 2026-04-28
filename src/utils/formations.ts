// 🏗️ Architecture: [[formations.md]]

export type PitchFormat = '5v5' | '7v7' | '9v9';

export interface FormationNode {
    id: string;      // Unique slot ID (e.g., 'FWD_1')
    label: string;   // UI Label (e.g., 'ST')
}

export interface FormationRow {
    nodes: FormationNode[];
}

export interface FormationPreset {
    name: string;
    rows: FormationRow[]; // From front to back (top of pitch to bottom)
}

export const FORMATIONS: Record<PitchFormat, Record<string, FormationPreset>> = {
    '5v5': {
        '1-2-1': {
            name: '1-2-1 (Diamond)',
            rows: [
                { nodes: [{ id: 'FWD_1', label: 'ST' }] },
                { nodes: [{ id: 'MID_L', label: 'LM' }, { id: 'MID_R', label: 'RM' }] },
                { nodes: [{ id: 'DEF_1', label: 'CB' }] },
            ]
        },
        '2-2': {
            name: '2-2 (Square)',
            rows: [
                { nodes: [{ id: 'FWD_L', label: 'LF' }, { id: 'FWD_R', label: 'RF' }] },
                { nodes: [{ id: 'DEF_L', label: 'LB' }, { id: 'DEF_R', label: 'RB' }] },
            ]
        }
    },
    '7v7': {
        '2-3-1': {
            name: '2-3-1 (Christmas Tree)',
            rows: [
                { nodes: [{ id: 'FWD_1', label: 'ST' }] },
                { nodes: [{ id: 'MID_L', label: 'LM' }, { id: 'MID_C', label: 'CM' }, { id: 'MID_R', label: 'RM' }] },
                { nodes: [{ id: 'DEF_L', label: 'LB' }, { id: 'DEF_R', label: 'RB' }] },
            ]
        },
        '3-2-1': {
            name: '3-2-1',
            rows: [
                { nodes: [{ id: 'FWD_1', label: 'ST' }] },
                { nodes: [{ id: 'MID_L', label: 'LM' }, { id: 'MID_R', label: 'RM' }] },
                { nodes: [{ id: 'DEF_L', label: 'LB' }, { id: 'DEF_C', label: 'CB' }, { id: 'DEF_R', label: 'RB' }] },
            ]
        }
    },
    '9v9': {
        '3-3-2': {
            name: '3-3-2',
            rows: [
                { nodes: [{ id: 'FWD_L', label: 'LS' }, { id: 'FWD_R', label: 'RS' }] },
                { nodes: [{ id: 'MID_L', label: 'LM' }, { id: 'MID_C', label: 'CM' }, { id: 'MID_R', label: 'RM' }] },
                { nodes: [{ id: 'DEF_L', label: 'LB' }, { id: 'DEF_C', label: 'CB' }, { id: 'DEF_R', label: 'RB' }] },
            ]
        }
    }
};

export function getFormation(format: string, preset: string): FormationPreset {
    const pitchFormat = (format || '5v5') as PitchFormat;
    const availablePresets = FORMATIONS[pitchFormat] || FORMATIONS['5v5'];
    return availablePresets[preset] || Object.values(availablePresets)[0];
}
