export interface RegionalInfo {
  regionCode: string;
  regionName: string;
  city: string;
  state: string;
  airportCode: string;
  collectionYear: string;
}

export interface SpeciesCount {
  region: string;
  scientificName: string;
  commonName: string;
  spCode: string;
  treeType: string;
  total: number;
}

export interface RawTreeData {
  dbaseId: string;
  region: string;
  treeId: string;
  scientificName: string;
  commonName: string;
  dbh: number;
  height: number;
  crownHeight: number;
  avgCrownDia: number;
}

export interface BiomassDensity {
  spCode: string;
  scientificName: string;
  commonName: string;
  density: number; // kg/m3
}

export interface GrowthCoefficient {
  region: string;
  scientificName: string;
  spCode: string;
  independentVar: string; // e.g., 'dbh', 'age'
  dependentVar: string; // e.g., 'age', 'height', 'dbh'
  equationName: string; // e.g., 'lin', 'quad', 'loglogw1'
  a: number;
  b: number;
  c?: number;
  d?: number;
  e?: number;
  mse?: number; // For log corrections
}

export interface AnnualGrowth {
  yearOffset: number;
  age: number;
  dbh: number;
  height: number;
  carbonStorage: number; // Total accumulated carbon (kg)
  annualSequestration: number; // Carbon added this specific year (kg)
}

export interface ProjectTree {
  id: string;
  count: number;
  speciesCommon: string;
  speciesScientific: string;
  initialDbh: number;
  initialHeight: number;
  currentCarbon: number; // kg (at year 0)
  forecastData: AnnualGrowth[]; // Projection array
}

export interface SpeciesInfo {
  scientificName: string;
  commonName: string;
  imageUrl: string;
}

export type TabView = 'builder' | 'dashboard' | 'analytics';
