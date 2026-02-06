import { Inspection, Job, Builder, Subdivision } from '@prisma/client';

// Types based on Ekotrope's Inspection Sync JSON format (simplified for this implementation)
export interface EkotropeProject {
    builderName: string;
    subdivisionName?: string;
    lotNumber: string;
    streetAddress: string;
    city: string;
    zipCode?: string;
    planName?: string;
    inspectionDate: string; // ISO Date
    raterName?: string;
    data: EkotropeInspectionData;
}

export interface EkotropeInspectionData {
    infiltration?: {
        cfm50: number;
    };
    mechanicalVentilation?: {
        type: string;
        measuredFlowRate: number;
    }[];
    ductSystems?: {
        leakageToOutside?: number;
        totalLeakage?: number;
    }[];
    // Add more fields as needed based on actual Ekotrope API
}

/**
 * Maps our internal data models to the Ekotrope JSON format.
 */
export function mapToEkotropeProject(
    job: Job & { builder: Builder | null; subdivision: Subdivision | null },
    inspection: Inspection,
    inspectorName?: string
): EkotropeProject {
    // Extract blower door results from inspection data/answers
    // This is a placeholder logic - in reality we'd parse the specific JSON structure of 'answers'
    let cfm50 = 0;
    if (inspection.answers) {
        try {
            const answers = (typeof inspection.answers === 'string'
                ? JSON.parse(inspection.answers)
                : inspection.answers) as Record<string, unknown>;
            if (answers.blower_door_cfm) {
                cfm50 = Number(answers.blower_door_cfm);
            }
        } catch {
            // If answers is not valid JSON, skip extraction
        }
    }

    return {
        builderName: job.builder?.name || 'Unknown Builder',
        subdivisionName: job.subdivision?.name,
        lotNumber: job.lotNumber,
        streetAddress: job.streetAddress,
        city: job.city,
        inspectionDate: inspection.updatedAt.toISOString(),
        raterName: inspectorName,
        data: {
            infiltration: cfm50 > 0 ? { cfm50 } : undefined,
        },
    };
}
