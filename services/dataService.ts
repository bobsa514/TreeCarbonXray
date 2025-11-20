import { RegionalInfo, SpeciesCount, RawTreeData, BiomassDensity, GrowthCoefficient } from '../types';

const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let startValueIndex = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
            let val = line.substring(startValueIndex, i).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            result.push(val);
            startValueIndex = i + 1;
        }
    }
    // Push the last value
    let lastVal = line.substring(startValueIndex).trim();
     if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
        lastVal = lastVal.slice(1, -1);
    }
    result.push(lastVal);
    return result;
};

export const parseRegionalInfo = (csv: string): RegionalInfo[] => {
    const lines = csv.trim().split('\n');
    // Skip header
    return lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        return {
            regionCode: cols[0],
            regionName: cols[1],
            city: cols[2],
            state: cols[3],
            airportCode: cols[4],
            collectionYear: cols[5]
        };
    });
};

export const parseSpeciesCount = (csv: string): SpeciesCount[] => {
    const lines = csv.trim().split('\n');
    return lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        // Grand total is the last column
        return {
            region: cols[0],
            scientificName: cols[1],
            commonName: cols[2],
            spCode: cols[3],
            treeType: cols[4],
            total: parseInt(cols[14] || '0', 10)
        };
    });
};

export const parseRawTreeData = (csv: string): RawTreeData[] => {
    const lines = csv.trim().split('\n');
    return lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        return {
            dbaseId: cols[0],
            region: cols[1],
            treeId: cols[4],
            scientificName: cols[8],
            commonName: cols[9],
            dbh: parseFloat(cols[19] || '0'),
            height: parseFloat(cols[20] || '0'),
            crownHeight: parseFloat(cols[22] || '0'),
            avgCrownDia: parseFloat(cols[25] || '0')
        };
    });
};

export const parseBiomassDensity = (csv: string): BiomassDensity[] => {
    const lines = csv.trim().split('\n');
    return lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        return {
            spCode: cols[0],
            scientificName: cols[1],
            commonName: cols[2],
            density: parseFloat(cols[3] || '0')
        };
    });
};

export const parseGrowthCoefficients = (csv: string): GrowthCoefficient[] => {
    const lines = csv.trim().split('\n');
    return lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        return {
            region: cols[0],
            scientificName: cols[1],
            spCode: cols[2],
            independentVar: cols[3], // dbh, age, etc.
            dependentVar: cols[4], // Predicts component
            equationName: cols[7], // lin, quad, etc.
            a: parseFloat(cols[8] || '0'),
            b: parseFloat(cols[9] || '0'),
            c: cols[10] ? parseFloat(cols[10]) : undefined,
            d: cols[11] ? parseFloat(cols[11]) : undefined,
            e: cols[12] ? parseFloat(cols[12]) : undefined,
            mse: cols[15] ? parseFloat(cols[15]) : 0
        };
    });
};