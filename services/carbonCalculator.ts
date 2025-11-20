import { AnnualGrowth, BiomassDensity, GrowthCoefficient, ProjectTree } from "../types";

// --- MATH ENGINE ---

const solveEquation = (eqName: string, x: number, coeffs: GrowthCoefficient): number => {
    const { a, b, c = 0, d = 0, mse = 0 } = coeffs;
    let y = 0;
    
    // Guard against negative inputs for logs/sqrts
    const safeX = Math.max(0.01, x);

    switch (eqName.toLowerCase()) {
        case 'lin': // a + b*x
            y = a + b * x;
            break;
        case 'quad': // a + b*x + c*x^2
            y = a + b * x + c * Math.pow(x, 2);
            break;
        case 'cub': // a + b*x + c*x^2 + d*x^3
            y = a + b * x + c * Math.pow(x, 2) + d * Math.pow(x, 3);
            break;
        case 'loglogw1': // EXP(a + b*LN(LN(x+1)) + (mse/2))
            // Note: LN(LN(x+1)) requires x > 0
            y = Math.exp(a + b * Math.log(Math.log(safeX + 1)) + (mse / 2));
            break;
        case 'loglogw2': // EXP(a + b*LN(LN(x+1)) + (SQRT(x)*(mse/2)))
            y = Math.exp(a + b * Math.log(Math.log(safeX + 1)) + (Math.sqrt(safeX) * (mse / 2)));
            break;
        case 'expow1': // EXP(a + b*x + (mse/2))
            y = Math.exp(a + b * x + (mse / 2));
            break;
        case 'loglogw3': // EXP(a + b*LN(LN(x+1)) + x*(mse/2))
            y = Math.exp(a + b * Math.log(Math.log(safeX + 1)) + (x * (mse / 2)));
            break;
        default:
            // Default linear fallback if unknown equation
            y = a + b * x;
    }
    return Math.max(0, y); // Prevent negative dimensions
};

// --- CORE LOGIC ---

// 1. Calculate Carbon for a single point in time
const calculateCarbonPoint = (dbhCm: number, heightM: number, density: number): number => {
    const dbhM = dbhCm / 100;
    // Simplified volumetric approach: V = Basal Area * Height * Form Factor (0.45)
    const volume = Math.PI * Math.pow(dbhM / 2, 2) * heightM * 0.45;
    const biomass = (volume * density) * 1.2; // +20% for roots/branches
    const carbon = biomass * 0.5;
    const co2 = carbon * 3.6667;
    return co2;
};

// 2. Main Forecasting Function
export const forecastTreeGrowth = (
    speciesName: string,
    initialDbh: number,
    horizonYears: number,
    densities: BiomassDensity[],
    growthCoeffs: GrowthCoefficient[]
): { annualData: AnnualGrowth[], currentCarbon: number } => {
    
    // A. Identify Species & Coefficients
    // Try to match exact scientific or common name in TS6
    const speciesCoeffs = growthCoeffs.filter(g => 
        g.scientificName.toLowerCase().includes(speciesName.toLowerCase()) || 
        speciesName.toLowerCase().includes(g.scientificName.toLowerCase())
    );

    // Find density
    const densObj = densities.find(d => 
        d.commonName.toLowerCase().includes(speciesName.toLowerCase()) || 
        d.scientificName.toLowerCase().includes(speciesName.toLowerCase())
    );
    const density = densObj ? densObj.density : 550; // Default density

    // Fallback: If no growth coefficients found for species, use 'Acer rubrum' as a generic proxy
    // or a "General Broadleaf" proxy if we had one.
    const proxyName = speciesCoeffs.length > 0 ? speciesName : "Acer rubrum";
    const activeCoeffs = speciesCoeffs.length > 0 ? speciesCoeffs : growthCoeffs.filter(g => g.scientificName === "Acer rubrum");

    // B. Determine Current Age from DBH
    // Look for Eq: Dependent=age, Independent=dbh
    const ageEq = activeCoeffs.find(c => c.dependentVar === 'age' && c.independentVar === 'dbh');
    
    let currentAge = 0;
    if (ageEq) {
        currentAge = solveEquation(ageEq.equationName, initialDbh, ageEq);
    } else {
        // Rough fallback: Age ~ DBH * 0.8 (Fast growing) to 1.5 (Slow growing)
        currentAge = initialDbh * 1.2; 
    }
    currentAge = Math.max(1, currentAge);

    // C. Find equations for growth (Age -> DBH) and allometry (DBH -> Height)
    // Note: TS6 often gives DBH -> Age, but we need Age -> DBH for projection.
    // Sometimes TS6 has "age" as independent variable to predict "dbh".
    const dbhPredEq = activeCoeffs.find(c => c.dependentVar === 'dbh' && c.independentVar === 'age');
    const heightPredEq = activeCoeffs.find(c => (c.dependentVar === 'tree ht' || c.dependentVar === 'height') && c.independentVar === 'dbh');

    // D. Iterate Years
    const annualData: AnnualGrowth[] = [];
    let previousTotalCarbon = 0;

    // Calculate Year 0 (Current)
    // If we don't have a height eq, use the estimator
    let initialHeight = 0;
    if (heightPredEq) {
        initialHeight = solveEquation(heightPredEq.equationName, initialDbh, heightPredEq);
    } else {
        initialHeight = 2 + 0.5 * Math.pow(initialDbh, 0.7); // Fallback
    }
    const currentCarbon = calculateCarbonPoint(initialDbh, initialHeight, density);
    previousTotalCarbon = currentCarbon;

    for (let y = 0; y <= horizonYears; y++) {
        const simAge = currentAge + y;
        
        // Predict DBH
        let simDbh = 0;
        if (y === 0) {
            simDbh = initialDbh;
        } else if (dbhPredEq) {
            simDbh = solveEquation(dbhPredEq.equationName, simAge, dbhPredEq);
        } else {
            // Fallback growth: +0.5cm to +1.0cm per year depending on age
            const growthRate = Math.max(0.2, 1.5 - (simAge * 0.01)); 
            simDbh = initialDbh + (growthRate * y); 
        }
        
        // Predict Height
        let simHeight = 0;
        if (heightPredEq) {
            simHeight = solveEquation(heightPredEq.equationName, simDbh, heightPredEq);
        } else {
             simHeight = 2 + 0.5 * Math.pow(simDbh, 0.7);
        }

        // Calculate Carbon
        const totalCarbon = calculateCarbonPoint(simDbh, simHeight, density);
        const annualSeq = Math.max(0, totalCarbon - previousTotalCarbon);
        
        annualData.push({
            yearOffset: y,
            age: simAge,
            dbh: parseFloat(simDbh.toFixed(2)),
            height: parseFloat(simHeight.toFixed(2)),
            carbonStorage: parseFloat(totalCarbon.toFixed(2)),
            annualSequestration: parseFloat(annualSeq.toFixed(2))
        });

        if(y > 0) previousTotalCarbon = totalCarbon;
    }

    return { annualData, currentCarbon };
};