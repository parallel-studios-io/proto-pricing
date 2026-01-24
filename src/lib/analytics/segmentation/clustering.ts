/**
 * Customer Clustering
 * K-means clustering for behavioral segmentation
 */

export interface ClusteringFeatures {
  customerId: string;
  mrr: number;
  tenure: number;
  growthRate: number;
  companySize: number; // 1-4 (startup, smb, mid_market, enterprise)
  usageScore: number; // 0-100
}

export interface Cluster {
  id: number;
  centroid: number[];
  members: string[]; // customer IDs
  size: number;
  characteristics: {
    avgMrr: number;
    avgTenure: number;
    avgGrowthRate: number;
    avgCompanySize: number;
    avgUsageScore: number;
  };
  suggestedName: string;
  suggestedDescription: string;
}

export interface ClusteringResult {
  clusters: Cluster[];
  silhouetteScore: number;
  inertia: number;
  iterations: number;
  converged: boolean;
}

/**
 * Perform K-means clustering on customer features
 */
export function performKMeansClustering(
  features: ClusteringFeatures[],
  options: {
    k?: number; // number of clusters, auto-detected if not provided
    maxIterations?: number;
    tolerance?: number;
    minK?: number;
    maxK?: number;
  } = {}
): ClusteringResult {
  if (features.length === 0) {
    return {
      clusters: [],
      silhouetteScore: 0,
      inertia: 0,
      iterations: 0,
      converged: true,
    };
  }

  const maxIterations = options.maxIterations ?? 100;
  const tolerance = options.tolerance ?? 0.0001;
  const minK = options.minK ?? 2;
  const maxK = options.maxK ?? Math.min(8, Math.floor(features.length / 10));

  // Convert features to normalized vectors
  const vectors = normalizeFeatures(features);

  // Auto-detect optimal K using elbow method + silhouette if not provided
  let k = options.k;
  if (!k) {
    k = findOptimalK(vectors, minK, maxK);
  }

  // Ensure k doesn't exceed data points
  k = Math.min(k, features.length);

  // Run K-means
  const { assignments, centroids, iterations, converged, inertia } = kmeans(
    vectors,
    k,
    maxIterations,
    tolerance
  );

  // Build cluster objects
  const clusters: Cluster[] = [];

  for (let i = 0; i < k; i++) {
    const memberIndices = assignments
      .map((a, idx) => (a === i ? idx : -1))
      .filter((idx) => idx >= 0);

    const members = memberIndices.map((idx) => features[idx].customerId);

    // Calculate cluster characteristics
    const clusterFeatures = memberIndices.map((idx) => features[idx]);

    const characteristics = {
      avgMrr: average(clusterFeatures.map((f) => f.mrr)),
      avgTenure: average(clusterFeatures.map((f) => f.tenure)),
      avgGrowthRate: average(clusterFeatures.map((f) => f.growthRate)),
      avgCompanySize: average(clusterFeatures.map((f) => f.companySize)),
      avgUsageScore: average(clusterFeatures.map((f) => f.usageScore)),
    };

    // Generate suggested name and description
    const { name, description } = generateClusterLabels(characteristics);

    clusters.push({
      id: i,
      centroid: centroids[i],
      members,
      size: members.length,
      characteristics,
      suggestedName: name,
      suggestedDescription: description,
    });
  }

  // Sort clusters by MRR (highest first)
  clusters.sort((a, b) => b.characteristics.avgMrr - a.characteristics.avgMrr);

  // Renumber after sorting
  clusters.forEach((c, i) => (c.id = i));

  // Calculate silhouette score
  const silhouetteScore = calculateSilhouetteScore(vectors, assignments, k);

  return {
    clusters,
    silhouetteScore,
    inertia,
    iterations,
    converged,
  };
}

/**
 * Normalize features to 0-1 range
 */
function normalizeFeatures(features: ClusteringFeatures[]): number[][] {
  if (features.length === 0) return [];

  // Calculate min/max for each dimension
  const mins = [Infinity, Infinity, Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];

  for (const f of features) {
    const values = [f.mrr, f.tenure, f.growthRate, f.companySize, f.usageScore];
    for (let i = 0; i < 5; i++) {
      mins[i] = Math.min(mins[i], values[i]);
      maxs[i] = Math.max(maxs[i], values[i]);
    }
  }

  // Normalize
  return features.map((f) => {
    const values = [f.mrr, f.tenure, f.growthRate, f.companySize, f.usageScore];
    return values.map((v, i) => {
      const range = maxs[i] - mins[i];
      return range > 0 ? (v - mins[i]) / range : 0;
    });
  });
}

/**
 * K-means algorithm
 */
function kmeans(
  vectors: number[][],
  k: number,
  maxIterations: number,
  tolerance: number
): {
  assignments: number[];
  centroids: number[][];
  iterations: number;
  converged: boolean;
  inertia: number;
} {
  const n = vectors.length;
  const dims = vectors[0].length;

  // Initialize centroids using k-means++
  const centroids = initializeCentroidsKMeansPlusPlus(vectors, k);

  let assignments: number[] = new Array(n).fill(0);
  let iterations = 0;
  let converged = false;

  while (iterations < maxIterations) {
    // Assign points to nearest centroid
    const newAssignments = vectors.map((v) => {
      let minDist = Infinity;
      let closest = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(v, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          closest = c;
        }
      }

      return closest;
    });

    // Check for convergence
    if (arraysEqual(assignments, newAssignments)) {
      converged = true;
      break;
    }

    assignments = newAssignments;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = vectors.filter((_, i) => assignments[i] === c);

      if (clusterPoints.length > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] = average(clusterPoints.map((p) => p[d]));
        }
      }
    }

    iterations++;
  }

  // Calculate inertia (sum of squared distances to centroids)
  let inertia = 0;
  for (let i = 0; i < n; i++) {
    inertia += euclideanDistance(vectors[i], centroids[assignments[i]]) ** 2;
  }

  return { assignments, centroids, iterations, converged, inertia };
}

/**
 * Initialize centroids using k-means++ algorithm
 */
function initializeCentroidsKMeansPlusPlus(vectors: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const n = vectors.length;

  // Choose first centroid randomly
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...vectors[firstIdx]]);

  // Choose remaining centroids
  for (let c = 1; c < k; c++) {
    // Calculate squared distances to nearest centroid
    const distances = vectors.map((v) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(v, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist ** 2;
    });

    // Choose next centroid with probability proportional to distance
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let target = Math.random() * totalDist;

    for (let i = 0; i < n; i++) {
      target -= distances[i];
      if (target <= 0) {
        centroids.push([...vectors[i]]);
        break;
      }
    }

    // Fallback if we didn't select
    if (centroids.length === c) {
      centroids.push([...vectors[Math.floor(Math.random() * n)]]);
    }
  }

  return centroids;
}

/**
 * Find optimal K using elbow method with silhouette validation
 */
function findOptimalK(vectors: number[][], minK: number, maxK: number): number {
  if (vectors.length < minK) return Math.max(1, vectors.length);

  const results: { k: number; inertia: number; silhouette: number }[] = [];

  for (let k = minK; k <= maxK; k++) {
    const { assignments, inertia } = kmeans(vectors, k, 50, 0.001);
    const silhouette = calculateSilhouetteScore(vectors, assignments, k);
    results.push({ k, inertia, silhouette });
  }

  // Find elbow point (where adding more clusters doesn't help much)
  let bestK = minK;
  let bestScore = -Infinity;

  for (const result of results) {
    // Combine silhouette (higher is better) with simplicity (fewer clusters)
    const simplicityBonus = 0.1 * (maxK - result.k);
    const score = result.silhouette + simplicityBonus;

    if (score > bestScore) {
      bestScore = score;
      bestK = result.k;
    }
  }

  return bestK;
}

/**
 * Calculate silhouette score
 */
function calculateSilhouetteScore(vectors: number[][], assignments: number[], k: number): number {
  if (k <= 1 || vectors.length <= k) return 0;

  const silhouettes: number[] = [];

  for (let i = 0; i < vectors.length; i++) {
    const myCluster = assignments[i];

    // Calculate a(i): average distance to points in same cluster
    const sameClusterDists: number[] = [];
    for (let j = 0; j < vectors.length; j++) {
      if (i !== j && assignments[j] === myCluster) {
        sameClusterDists.push(euclideanDistance(vectors[i], vectors[j]));
      }
    }
    const a = sameClusterDists.length > 0 ? average(sameClusterDists) : 0;

    // Calculate b(i): minimum average distance to any other cluster
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c !== myCluster) {
        const otherClusterDists: number[] = [];
        for (let j = 0; j < vectors.length; j++) {
          if (assignments[j] === c) {
            otherClusterDists.push(euclideanDistance(vectors[i], vectors[j]));
          }
        }
        if (otherClusterDists.length > 0) {
          b = Math.min(b, average(otherClusterDists));
        }
      }
    }

    if (b === Infinity) b = a;

    // Silhouette coefficient
    const maxAB = Math.max(a, b);
    const s = maxAB > 0 ? (b - a) / maxAB : 0;
    silhouettes.push(s);
  }

  return average(silhouettes);
}

/**
 * Generate cluster labels based on characteristics
 */
function generateClusterLabels(chars: {
  avgMrr: number;
  avgTenure: number;
  avgGrowthRate: number;
  avgCompanySize: number;
  avgUsageScore: number;
}): { name: string; description: string } {
  const mrrLevel = chars.avgMrr >= 5000 ? "high" : chars.avgMrr >= 500 ? "mid" : "low";
  const tenureLevel = chars.avgTenure >= 18 ? "long" : chars.avgTenure >= 6 ? "mid" : "new";
  const growthLevel = chars.avgGrowthRate >= 0.1 ? "growing" : chars.avgGrowthRate >= 0 ? "stable" : "declining";
  const sizeLevel = chars.avgCompanySize >= 3 ? "enterprise" : chars.avgCompanySize >= 2 ? "mid-market" : "small";

  // Generate name based on dominant characteristics
  if (mrrLevel === "high" && tenureLevel === "long") {
    return {
      name: "Enterprise Loyalists",
      description: `High-value customers (avg €${chars.avgMrr.toFixed(0)}/mo) with long tenure. Focus on retention and expansion.`,
    };
  }

  if (mrrLevel === "high" && tenureLevel !== "long") {
    return {
      name: "Rising Stars",
      description: `Recent high-value customers (avg €${chars.avgMrr.toFixed(0)}/mo). Strong onboarding and success focus needed.`,
    };
  }

  if (growthLevel === "growing" && mrrLevel !== "high") {
    return {
      name: "Growth Accounts",
      description: `${sizeLevel.charAt(0).toUpperCase() + sizeLevel.slice(1)} businesses showing expansion signals. Prime upgrade candidates.`,
    };
  }

  if (tenureLevel === "long" && mrrLevel === "mid") {
    return {
      name: "Steady State",
      description: `Stable mid-tier customers with ${chars.avgTenure.toFixed(0)} months tenure. Reliable base revenue.`,
    };
  }

  if (tenureLevel === "new" && mrrLevel === "low") {
    return {
      name: "New Starters",
      description: `Recent ${sizeLevel} customers exploring the product. Critical onboarding period.`,
    };
  }

  if (growthLevel === "declining") {
    return {
      name: "At-Risk Accounts",
      description: `Customers showing decline signals. Requires intervention and success outreach.`,
    };
  }

  // Default
  return {
    name: `${sizeLevel.charAt(0).toUpperCase() + sizeLevel.slice(1)} Segment`,
    description: `${sizeLevel.charAt(0).toUpperCase() + sizeLevel.slice(1)} customers with avg €${chars.avgMrr.toFixed(0)}/mo revenue.`,
  };
}

// Helper functions
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
